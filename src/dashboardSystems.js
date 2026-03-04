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
const SPAM_WINDOW = 5000; // 5 seconds window for spam tracking
const SPAM_CLEANUP_INTERVAL = 60000; // Cleanup old entries every minute

// Cleanup old spam tracker entries to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, timestamps] of spamTracker.entries()) {
        // Remove entries with no recent activity
        const recent = timestamps.filter(t => now - t < SPAM_WINDOW);
        if (recent.length === 0) {
            spamTracker.delete(key);
            cleaned++;
        } else if (recent.length !== timestamps.length) {
            spamTracker.set(key, recent);
        }
    }
    if (cleaned > 0 && logger) logger.debug(`[DashboardSystems] Cleaned up ${cleaned} stale spam tracker entries`);
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
        const guildData = await Guild.findOne({ guildId }).select('settings.modules customCommands').lean();
        const mods = guildData?.settings?.modules || {};

        // ── CUSTOM COMMANDS / AUTO-RESPONDER ───────────────────────
        const customCmds = (guildData?.customCommands || []).filter(c => c.enabled);
        if (customCmds.length > 0) {
            const content = message.content.trim();
            const lowerContent = content.toLowerCase();

            for (const cmd of customCmds) {
                let triggered = false;
                const trig = cmd.trigger.toLowerCase();

                if (cmd.type === 'exact' && lowerContent === trig) triggered = true;
                else if (cmd.type === 'starts' && lowerContent.startsWith(trig)) triggered = true;
                else if (cmd.type === 'contains' && lowerContent.includes(trig)) triggered = true;

                if (triggered) {
                    if (cmd.isEmbed) {
                        const embed = new EmbedBuilder()
                            .setColor(message.guild.members.me?.displayHexColor || '#6c63ff')
                            .setDescription(cmd.response)
                            .setTimestamp();
                        await message.channel.send({ embeds: [embed] });
                    } else {
                        await message.channel.send(cmd.response);
                    }
                    return; // Stop if a custom command was triggered
                }
            }
        }

        // ── ANTI-SPAM ──────────────────────────────────────────────
        const spam = mods.antispam || {};
        if (spam.enabled) {
            const key = `${guildId}:${message.author.id}`;
            const now = Date.now();
            const limit = spam.maxMessagesPerWindow || 5;

            if (!spamTracker.has(key)) spamTracker.set(key, []);
            const times = spamTracker.get(key).filter(t => now - t < SPAM_WINDOW);
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

        // ── WELCOME (Advanced) ─────────────────────────────────────
        const guildData = await Guild.findOne({ guildId }).select('welcomeConfig').lean();
        const wlc = guildData?.welcomeConfig || {};

        if (wlc.enabled && wlc.channelId) {
            const count = member.guild.memberCount;
            const msg = (wlc.message || 'Welcome {user} to {server}! You are member #{count}.')
                .replace('{user}', `<@${member.id}>`)
                .replace('{server}', member.guild.name)
                .replace('{count}', count.toLocaleString());

            try {
                const ch = member.guild.channels.cache.get(wlc.channelId) || await member.guild.channels.fetch(wlc.channelId).catch(() => null);
                if (ch?.isTextBased()) {
                    const embed = new EmbedBuilder()
                        .setColor(member.guild.members.me?.displayHexColor || '#6c63ff')
                        .setTitle(wlc.title.replace('{server}', member.guild.name))
                        .setDescription(msg)
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                        .setFooter({ text: `Member #${count.toLocaleString()}` })
                        .setTimestamp();

                    if (wlc.imageURL) embed.setImage(wlc.imageURL);

                    const buttons = [];
                    if (wlc.buttons?.rules?.enabled) {
                        buttons.push(new ButtonBuilder().setCustomId('welcome_rules').setLabel(wlc.buttons.rules.label).setStyle(ButtonStyle.Secondary).setEmoji('📜'));
                    }
                    if (wlc.buttons?.roles?.enabled) {
                        buttons.push(new ButtonBuilder().setCustomId('welcome_roles').setLabel(wlc.buttons.roles.label).setStyle(ButtonStyle.Primary).setEmoji('🎭'));
                    }
                    if (wlc.buttons?.apply?.enabled) {
                        buttons.push(new ButtonBuilder().setCustomId('welcome_apply').setLabel(wlc.buttons.apply.label).setStyle(ButtonStyle.Success).setEmoji('📝'));
                    }

                    const row = buttons.length > 0 ? new ActionRowBuilder().addComponents(buttons) : null;
                    await ch.send({ content: `<@${member.id}>`, embeds: [embed], components: row ? [row] : [] });
                }
            } catch (err) {
                if (logger) logger.debug(`[Welcome] Failed to send advanced welcome: ${err.message}`);
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

    // ════════════════════════════════════════════════════════════════
    // INTERACTION CREATE — Buttons for Terminal/Welcome
    // ════════════════════════════════════════════════════════════════
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;

        const { customId, guildId, user } = interaction;

        // ── STAFF TERMINAL HANDLERS ────────────────────────────────
        if (customId.startsWith('terminal_')) {
            const staffSystem = client.systems.staff;
            const terminalCmd = client.commands.get('staff_terminal');
            if (!staffSystem || !terminalCmd) return interaction.reply({ content: 'System offline.', ephemeral: true });

            try {
                if (customId === 'terminal_start') await staffSystem.startShift(user.id, guildId);
                else if (customId.startsWith('terminal_pause_')) await staffSystem.pauseShift(user.id, guildId);
                else if (customId.startsWith('terminal_resume_')) await staffSystem.resumeShift(user.id, guildId);
                else if (customId.startsWith('terminal_end_')) await staffSystem.endShift(user.id, guildId);
                else if (customId === 'terminal_achievements') {
                    const achCmd = client.commands.get('achievement_tracker');
                    if (achCmd) return await achCmd.execute(interaction);
                }

                // Refresh terminal for all except achievements (which handles its own response)
                if (customId !== 'terminal_achievements') {
                    await terminalCmd.renderTerminal(interaction, client);
                }
            } catch (e) {
                interaction.reply({ content: `Terminal error: ${e.message}`, ephemeral: true });
            }
        }

        // ── ENHANCED COMMAND HANDLERS ──────────────────────────────
        if (customId.includes('profile_') || customId.includes('export_stats_')) {
            const cmd = client.commands.get('staff_profile');
            if (cmd) {
                if (customId.startsWith('export_stats_')) await cmd.handleExportStats(interaction, client);
                else await cmd.handleProfileButtons(interaction, client);
            }
        }
        else if (customId === 'lb_my_rank') {
            const cmd = client.commands.get('leaderboard');
            if (cmd) await cmd.handleLeaderboardButtons(interaction, client);
        }
        else if (customId.startsWith('warn_')) {
            const cmd = client.commands.get('warn');
            if (cmd) await cmd.handleHistoryButton(interaction, client);
        }
        else if (customId.startsWith('status_')) {
            const cmd = client.commands.get('server_status');
            if (cmd) await cmd.handleStatusButtons(interaction, client);
        }
        else if (customId.startsWith('case_')) {
            const cmd = client.commands.get('case_file');
            if (cmd) await cmd.handleCaseButtons(interaction, client);
        }
        else if (customId.startsWith('activity_filter_')) {
            const cmd = client.commands.get('activity_log');
            if (cmd) await cmd.handleActivityFilters(interaction, client);
        }
        else if (customId.startsWith('activity_ping_')) {
            const cmd = client.commands.get('check_activity');
            if (cmd) await cmd.execute(interaction, client); // Handled inside execute collector usually, but good for persistence
        }
        else if (customId.startsWith('stats_')) {
            const cmd = client.commands.get('staff_stats');
            if (cmd) await cmd.handleStatsButtons(interaction, client);
        }
        else if (customId === 'slb_my_standing') {
            const cmd = client.commands.get('shift_leaderboard');
            if (cmd) await cmd.handleStandingButton(interaction, client);
        }

        // ── V4 MODERATION SUITE HANDLERS ──────────────────────────
        else if (customId.startsWith('ban_')) {
            const cmd = client.commands.get('ban_user');
            if (cmd) await cmd.handleBanButtons(interaction, client);
        }
        else if (customId.startsWith('mute_')) {
            const cmd = client.commands.get('mute_user');
            if (cmd) await cmd.handleMuteButtons(interaction, client);
        }
        else if (customId.startsWith('history_')) {
            const cmd = client.commands.get('history_lookup');
            if (cmd) await cmd.handleHistoryButtons(interaction, client);
        }
        else if (customId.startsWith('strike_')) {
            const cmd = client.commands.get('strike_check');
            if (cmd) await cmd.handleStrikeButtons(interaction, client);
        }
        else if (customId.startsWith('kick_')) {
            const cmd = client.commands.get('kick_user');
            if (cmd) await cmd.handleKickButtons(interaction, client);
        }
        else if (customId.startsWith('v4_')) {
            const cmd = client.commands.get('security_hub');
            if (cmd) await cmd.handleHubButtons(interaction, client);
        }
        else if (customId.startsWith('stats_period_')) {
            const cmd = client.commands.get('moderation_stats');
            if (cmd) await cmd.handleStatsButtons(interaction, client);
        }
        else if (customId.startsWith('chart_')) {
            const cmd = client.commands.get('moderation_chart');
            if (cmd) await cmd.handleChartButtons(interaction, client);
        }
        else if (customId.startsWith('spam_')) {
            const cmd = client.commands.get('anti_spam');
            if (cmd) await cmd.handleSpamButtons(interaction, client);
        }
        else if (customId.startsWith('link_')) {
            const cmd = client.commands.get('link_blocker');
            if (cmd) await cmd.handleLinkButtons(interaction, client);
        }
        else if (customId.startsWith('punish_')) {
            const cmd = client.commands.get('punishment_summary');
            if (cmd) await cmd.handlePunishButtons(interaction, client);
        }
        else if (customId.startsWith('report_')) {
            const cmd = client.commands.get('mod_report');
            if (cmd) await cmd.handleReportButtons(interaction, client);
        }
        else if (customId.startsWith('audit_')) {
            const cmd = client.commands.get('audit_logs');
            if (cmd) await cmd.handleAuditButtons(interaction, client);
        }
        else if (customId.startsWith('filter_toggle_')) {
            const cmd = client.commands.get('message_filter');
            if (cmd) await cmd.handleFilterButtons(interaction, client);
        }
        else if (customId.startsWith('violation_')) {
            const cmd = client.commands.get('rule_violation');
            if (cmd) await cmd.handleViolationButtons(interaction, client);
        }
        else if (customId.startsWith('auto_v4_')) {
            const cmdName = customId.replace('auto_v4_', '');
            const cmd = client.commands.get(cmdName);
            if (cmd) await cmd.execute(interaction, client);
        }

        // ── WELCOME BUTTON HANDLERS ────────────────────────────────
        if (customId === 'welcome_rules') {
            interaction.reply({ content: '📜 **Server Rules:** Please check the dedicated <#rules-channel> or refer to the server handbook for behavioral guidelines.', ephemeral: true });
        } else if (customId === 'welcome_roles') {
            interaction.reply({ content: '🎭 **Self-Roles:** Use the `/roles` command or check the #onboarding channel to customize your identity.', ephemeral: true });
        } else if (customId === 'welcome_apply') {
            const applyCmd = client.commands.get('apply_panel');
            if (applyCmd) await applyCmd.execute(interaction);
            else interaction.reply({ content: '📝 Application system is currently undergoing maintenance.', ephemeral: true });
        }
    });

    // ════════════════════════════════════════════════════════════════
    // INTERACTION CREATE — Modals for Security Management
    // ════════════════════════════════════════════════════════════════
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isModalSubmit()) return;
        const { customId } = interaction;

        if (customId === 'link_whitelist_modal') {
            const cmd = client.commands.get('link_blocker');
            if (cmd) await cmd.handleLinkModal(interaction, client);
        }
    });

    if (logger) logger.info('[DashboardSystems] ✅ All systems registered (automod, antispam, welcome, autorole, logging, terminal)');
}

module.exports = { register, invalidateCache };
