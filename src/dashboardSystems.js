/**
 * dashboardSystems.js
 * ──────────────────────────────────────────────────────────────────
 * Reads settings.modules.* from the Guild DB (saved via the web
 * dashboard) and enforces them in real Discord events.
 *
 * Systems handled:
 *  - automod    : message filter (profanity, links, invites, mentions)
 *  - antispam   : rate-limit messages per user
 *  - welcome    : member join message + optional DM
 *  - autorole   : assign roles on member join
 *  - logging    : log events to configured channels
 * ──────────────────────────────────────────────────────────────────
 */

'use strict';

const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { Guild } = require('./database/mongo');

let logger = null; // Will be set in register function

// ── In-memory spam tracker: { guildId:userId → [timestamps] }
const spamTracker = new Map();
const SPAM_WINDOW = 5000; // 5 seconds
const SPAM_CLEANUP_INTERVAL = 60000; // 1 minute

// Cleanup old spam tracker entries to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, times] of spamTracker.entries()) {
        const recent = times.filter(t => now - t < SPAM_WINDOW);
        if (recent.length === 0) {
            spamTracker.delete(key);
            cleaned++;
        } else {
            spamTracker.set(key, recent);
        }
    }
    if (cleaned > 0 && logger) logger.debug(`[DashboardSystems] Cleaned ${cleaned} stale spam tracker entries`);
}, SPAM_CLEANUP_INTERVAL);

// ── Settings cache (5-minute TTL to avoid DB hammering)
const settingsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function getModules(guildId) {
    const cached = settingsCache.get(guildId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;
    try {
        const g = await Guild.findOne({ guildId }).select('settings.modules').lean();
        const data = g?.settings?.modules || {};
        settingsCache.set(guildId, { data, ts: Date.now() });
        return data;
    } catch (err) {
        if (logger) logger.error(`[DashboardSystems] Failed to load modules for guild ${guildId}: ${err.message}`);
        return {};
    }
}

// Invalidate cache when dashboard saves settings
function invalidateCache(guildId) {
    settingsCache.delete(guildId);
}

// ── Helper: send a log embed to a channel
async function sendLog(guild, channelId, embed) {
    if (!channelId) return;
    try {
        const ch = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
        if (ch?.isTextBased()) await ch.send({ embeds: [embed] });
    } catch (err) {
        // Channel may not exist or bot lacks permissions - log for debugging
        if (logger) logger.debug(`[DashboardSystems] Failed to send log to channel ${channelId}: ${err.message}`);
    }
}

// ── PROFANITY word list (basic defaults — expanded by dashboard settings)
const DEFAULT_BANNED = ['nigger', 'faggot', 'retard'];

// ── DISCORD INVITE regex (safe, bounded to prevent ReDoS)
const INVITE_REGEX = /discord\.(gg|com\/invite)\/[a-zA-Z0-9-]{2,32}/i;

// ── URL regex (safe, bounded to prevent ReDoS)
const URL_REGEX = /https?:\/\/[a-zA-Z0-9][-a-zA-Z0-9]*[a-zA-Z0-9]\.[a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9](?:\/[-a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=]*)?/gi;

/**
 * Register all dashboard-driven event listeners on the bot client.
 * Call once after the bot is ready.
 */
function register(client, loggerInstance) {
    logger = loggerInstance;

    // ════════════════════════════════════════════════════════════════
    // MESSAGE CREATE — automod + antispam
    // ════════════════════════════════════════════════════════════════
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.guild) return;

        const guildId = message.guild.id;
        const mods = await getModules(guildId);

        // ── ANTI-SPAM ──────────────────────────────────────────────
        const spam = mods.antispam || {};
        if (spam.enabled) {
            const key = `${guildId}:${message.author.id}`;
            const now = Date.now();
            const window = 5000; // 5 seconds
            const limit = spam.maxMessagesPerWindow || 5;

            if (!spamTracker.has(key)) spamTracker.set(key, []);
            const times = spamTracker.get(key).filter(t => now - t < window);
            times.push(now);
            spamTracker.set(key, times);

            if (times.length > limit) {
                spamTracker.delete(key);
                try { await message.delete(); } catch (err) {
                    if (logger) logger.debug(`[Anti-Spam] Failed to delete spam message: ${err.message}`);
                }

                const action = spam.action || 'delete';
                if (action === 'timeout' || action === 'kick' || action === 'ban') {
                    const member = message.member;
                    if (!member) return;
                    try {
                        if (action === 'timeout') await member.timeout(5 * 60 * 1000, 'Anti-Spam: too many messages');
                        if (action === 'kick') await member.kick('Anti-Spam: too many messages');
                        if (action === 'ban') await message.guild.members.ban(message.author.id, { reason: 'Anti-Spam: too many messages' });
                    } catch (err) {
                        if (logger) logger.debug(`[Anti-Spam] Failed to apply action ${action}: ${err.message}`);
                    }
                }

                if (spam.logChannel) {
                    await sendLog(message.guild, spam.logChannel, new EmbedBuilder()
                        .setColor('#ff4757')
                        .setTitle('🚫 Anti-Spam Triggered')
                        .addFields(
                            { name: 'User', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
                            { name: 'Action', value: (spam.action || 'delete').toUpperCase(), inline: true },
                            { name: 'Channel', value: `<#${message.channel.id}>`, inline: true }
                        )
                        .setTimestamp()
                    );
                }
                return; // No further checks needed
            }
        }

        // ── AUTO-MOD ───────────────────────────────────────────────
        const am = mods.automod || {};
        if (!am.blockProfanity && !am.blockLinks && !am.blockInvites && !am.antiMentionSpam) return;

        const content = message.content.toLowerCase();
        let violated = false;
        let reason = '';

        // Profanity
        if (am.blockProfanity) {
            const banned = [...DEFAULT_BANNED, ...(am.bannedWords || []).map(w => w.toLowerCase())];
            if (banned.some(w => content.includes(w))) { violated = true; reason = 'Profanity'; }
        }

        // Invites
        if (!violated && am.blockInvites && INVITE_REGEX.test(message.content)) {
            violated = true; reason = 'Discord Invite';
        }

        // External links
        if (!violated && am.blockLinks) {
            const urls = message.content.match(URL_REGEX) || [];
            const allowed = (am.allowedDomains || ['discord.com', 'discord.gg']).map(d => d.toLowerCase());
            const hasExternal = urls.some(url => !allowed.some(d => url.toLowerCase().includes(d)));
            if (hasExternal) { violated = true; reason = 'External Link'; }
        }

        // Mention spam
        if (!violated && am.antiMentionSpam) {
            const maxM = am.maxMentions || 5;
            if (message.mentions.users.size + message.mentions.roles.size > maxM) {
                violated = true; reason = 'Mass Mentions';
            }
        }

        if (!violated) return;

        // Delete the message
        try { await message.delete(); } catch (err) {
            if (logger) logger.debug(`[AutoMod] Failed to delete message: ${err.message}`);
        }

        // Notify in channel briefly
        try {
            const warn = await message.channel.send({ content: `⚠️ <@${message.author.id}> your message was removed: **${reason}**` });
            setTimeout(() => warn.delete().catch((e) => {
                if (logger) logger.debug(`[AutoMod] Failed to delete warning message: ${e.message}`);
            }), 5000);
        } catch (err) {
            if (logger) logger.debug(`[AutoMod] Failed to send warning: ${err.message}`);
        }

        // Auto-timeout
        if (am.autoTimeout && message.member) {
            const dur = (am.timeoutDuration || 10) * 60 * 1000;
            try { await message.member.timeout(dur, `AutoMod: ${reason}`); } catch (err) {
                if (logger) logger.debug(`[AutoMod] Failed to timeout user: ${err.message}`);
            }
        }

        // Log violation
        if (am.logViolations && am.logChannel) {
            await sendLog(message.guild, am.logChannel, new EmbedBuilder()
                .setColor('#ffa502')
                .setTitle('🛡️ AutoMod — Message Removed')
                .addFields(
                    { name: 'User', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
                    { name: 'Violation', value: reason, inline: true },
                    { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
                    { name: 'Content', value: message.content.slice(0, 500) || '[empty]', inline: false }
                )
                .setTimestamp()
            );
        }
    });

    // ════════════════════════════════════════════════════════════════
    // GUILD MEMBER ADD — welcome + autorole
    // ════════════════════════════════════════════════════════════════
    client.on('guildMemberAdd', async (member) => {
        const guildId = member.guild.id;
        const mods = await getModules(guildId);

        // ── WELCOME ────────────────────────────────────────────────
        const wlc = mods.welcome || {};
        if (wlc.enabled && wlc.channelId) {
            const count = member.guild.memberCount;
            const msg = (wlc.message || 'Welcome {user} to {server}! You are member #{count}.')
                .replace('{user}', `<@${member.id}>`)
                .replace('{server}', member.guild.name)
                .replace('{count}', count.toLocaleString());

            try {
                const ch = member.guild.channels.cache.get(wlc.channelId);
                if (ch?.isTextBased()) {
                    const embed = new EmbedBuilder()
                        .setColor('#6c63ff')
                        .setTitle(`👋 Welcome to ${member.guild.name}!`)
                        .setDescription(msg)
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                        .setFooter({ text: `Member #${count.toLocaleString()}` })
                        .setTimestamp();
                    await ch.send({ embeds: [embed] });
                }
            } catch (err) {
                if (logger) logger.debug(`[Welcome] Failed to send welcome message: ${err.message}`);
            }

            // DM welcome
            if (wlc.dmEnabled && wlc.dmMessage) {
                const dmMsg = wlc.dmMessage
                    .replace('{user}', member.user.username)
                    .replace('{server}', member.guild.name)
                    .replace('{count}', member.guild.memberCount);
                try { await member.send(dmMsg); } catch (err) {
                    // DM failed (user may have DMs disabled) - common, don't log unless debug
                }
            }
        }

        // ── AUTO-ROLE ────────────────────────────────────────────
        const ar = mods.autorole || {};
        if (ar.joinEnabled && ar.joinRoleId) {
            try {
                const role = member.guild.roles.cache.get(ar.joinRoleId);
                if (role) await member.roles.add(role, 'Dashboard: Auto-Role on Join');
            } catch (err) {
                if (logger) logger.debug(`[AutoRole] Failed to add join role: ${err.message}`);
            }
        }

        // Bot auto-role
        if (ar.botEnabled && ar.botRoleId && member.user.bot) {
            try {
                const role = member.guild.roles.cache.get(ar.botRoleId);
                if (role) await member.roles.add(role, 'Dashboard: Bot Auto-Role');
            } catch (err) {
                if (logger) logger.debug(`[AutoRole] Failed to add bot role: ${err.message}`);
            }
        }

        // ── LOGGING (member join) ─────────────────────────────────
        const log = mods.logging || {};
        if (log.memberLog && log.memberLogChannel) {
            await sendLog(member.guild, log.memberLogChannel, new EmbedBuilder()
                .setColor('#00e096')
                .setTitle('📥 Member Joined')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'User', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
                    { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: 'Members', value: member.guild.memberCount.toLocaleString(), inline: true }
                )
                .setFooter({ text: `ID: ${member.id}` })
                .setTimestamp()
            );
        }
    });

    // ════════════════════════════════════════════════════════════════
    // GUILD MEMBER REMOVE — logging
    // ════════════════════════════════════════════════════════════════
    client.on('guildMemberRemove', async (member) => {
        const mods = await getModules(member.guild.id);
        const log = mods.logging || {};
        if (log.memberLog && log.memberLogChannel) {
            await sendLog(member.guild, log.memberLogChannel, new EmbedBuilder()
                .setColor('#ff4757')
                .setTitle('📤 Member Left')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'User', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
                    { name: 'Roles', value: member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.name).join(', ') || 'None', inline: false }
                )
                .setFooter({ text: `ID: ${member.id}` })
                .setTimestamp()
            );
        }
    });

    // ════════════════════════════════════════════════════════════════
    // MESSAGE DELETE — logging
    // ════════════════════════════════════════════════════════════════
    client.on('messageDelete', async (message) => {
        if (message.author?.bot || !message.guild) return;
        const mods = await getModules(message.guild.id);
        const log = mods.logging || {};
        if (log.messageLog && log.messageLogChannel) {
            await sendLog(message.guild, log.messageLogChannel, new EmbedBuilder()
                .setColor('#ffa502')
                .setTitle('🗑️ Message Deleted')
                .addFields(
                    { name: 'Author', value: `<@${message.author?.id}> (${message.author?.tag})`, inline: true },
                    { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
                    { name: 'Content', value: message.content?.slice(0, 1000) || '[No content / embed]', inline: false }
                )
                .setTimestamp()
            );
        }
    });

    // ════════════════════════════════════════════════════════════════
    // MESSAGE UPDATE — logging
    // ════════════════════════════════════════════════════════════════
    client.on('messageUpdate', async (oldMsg, newMsg) => {
        if (oldMsg.author?.bot || !oldMsg.guild) return;
        if (oldMsg.content === newMsg.content) return;
        const mods = await getModules(oldMsg.guild.id);
        const log = mods.logging || {};
        if (log.messageLog && log.messageLogChannel) {
            await sendLog(oldMsg.guild, log.messageLogChannel, new EmbedBuilder()
                .setColor('#f1c40f')
                .setTitle('✏️ Message Edited')
                .addFields(
                    { name: 'Author', value: `<@${oldMsg.author?.id}> (${oldMsg.author?.tag})`, inline: true },
                    { name: 'Channel', value: `<#${oldMsg.channel.id}>`, inline: true },
                    { name: 'Before', value: oldMsg.content?.slice(0, 500) || '[empty]', inline: false },
                    { name: 'After', value: newMsg.content?.slice(0, 500) || '[empty]', inline: false }
                )
                .setURL(newMsg.url)
                .setTimestamp()
            );
        }
    });

    // ════════════════════════════════════════════════════════════════
    // GUILD MEMBER UPDATE — role changes logging
    // ════════════════════════════════════════════════════════════════
    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        const mods = await getModules(newMember.guild.id);
        const log = mods.logging || {};
        if (!log.roleLog || !log.roleLogChannel) return;

        const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
        const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
        if (!added.size && !removed.size) return;

        await sendLog(newMember.guild, log.roleLogChannel, new EmbedBuilder()
            .setColor('#6c63ff')
            .setTitle('🎭 Roles Updated')
            .addFields(
                { name: 'Member', value: `<@${newMember.id}> (${newMember.user.tag})`, inline: false },
                ...(added.size ? [{ name: '✅ Roles Added', value: added.map(r => r.name).join(', '), inline: true }] : []),
                ...(removed.size ? [{ name: '❌ Roles Removed', value: removed.map(r => r.name).join(', '), inline: true }] : [])
            )
            .setTimestamp()
        );
    });

    // ════════════════════════════════════════════════════════════════
    // VOICE STATE UPDATE — logging
    // ════════════════════════════════════════════════════════════════
    client.on('voiceStateUpdate', async (oldState, newState) => {
        const guild = newState.guild || oldState.guild;
        if (!guild) return;
        const mods = await getModules(guild.id);
        const log = mods.logging || {};
        if (!log.voiceLog || !log.voiceLogChannel) return;

        const member = newState.member || oldState.member;
        let action = '';
        if (!oldState.channel && newState.channel) action = `📞 Joined **${newState.channel.name}**`;
        else if (oldState.channel && !newState.channel) action = `📴 Left **${oldState.channel.name}**`;
        else if (oldState.channelId !== newState.channelId) action = `🔀 Moved **${oldState.channel?.name}** → **${newState.channel?.name}**`;
        else return;

        await sendLog(guild, log.voiceLogChannel, new EmbedBuilder()
            .setColor('#00b7ff')
            .setTitle('🔊 Voice Activity')
            .addFields(
                { name: 'Member', value: `<@${member?.id}> (${member?.user.tag})`, inline: true },
                { name: 'Action', value: action, inline: true }
            )
            .setTimestamp()
        );
    });

    // ════════════════════════════════════════════════════════════════
    // GUILD BAN ADD / REMOVE — mod action logging
    // ════════════════════════════════════════════════════════════════
    client.on('guildBanAdd', async (ban) => {
        const mods = await getModules(ban.guild.id);
        const log = mods.logging || {};
        if (!log.modLog || !log.modLogChannel) return;
        await sendLog(ban.guild, log.modLogChannel, new EmbedBuilder()
            .setColor('#ff4757')
            .setTitle('🔨 Member Banned')
            .addFields(
                { name: 'User', value: `${ban.user.tag} (<@${ban.user.id}>)`, inline: true },
                { name: 'Reason', value: ban.reason || 'No reason provided', inline: true }
            )
            .setTimestamp()
        );
    });

    client.on('guildBanRemove', async (ban) => {
        const mods = await getModules(ban.guild.id);
        const log = mods.logging || {};
        if (!log.modLog || !log.modLogChannel) return;
        await sendLog(ban.guild, log.modLogChannel, new EmbedBuilder()
            .setColor('#00e096')
            .setTitle('✅ Member Unbanned')
            .addFields({ name: 'User', value: `${ban.user.tag} (<@${ban.user.id}>)`, inline: true })
            .setTimestamp()
        );
    });

    if (logger) logger.info('[DashboardSystems] ✅ All auto-working systems registered (automod, antispam, welcome, autorole, logging)');
}

module.exports = { register, invalidateCache };
