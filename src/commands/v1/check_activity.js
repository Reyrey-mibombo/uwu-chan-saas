const { 
    SlashCommandBuilder, 
    
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ComponentType,
    ActivityType,
    PermissionsBitField,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const { createCustomEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');

// In-memory storage
const activityHistory = new Map();
const viewModes = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check_activity')
        .setDescription('🔬 Advanced telemetry, deep scan, and mutual servers check.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to scan')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('live')
                .setDescription('Enable live telemetry updates')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('target') || interaction.user;
        const live = interaction.options.getBoolean('live') ?? false;
        
        let member;
        try {
            member = await interaction.guild.members.fetch({ user: targetUser.id, force: true });
        } catch (e) {
            return interaction.editReply('❌ Could not find that user in this server.');
        }

        // Initial Presence Check
        const presence = member.presence;
        if (!presence || presence.status === 'offline') {
            const offlineEmbed = new ()
                .setTitle(`🔭 Target Lost: ${targetUser.username}`)
                .setDescription('🔒 This user is **Offline**, **Invisible**, or has privacy settings enabled.')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
                .setColor('primary')
                .setFooter({ text: 'Telemetry Unavailable' });
            return interaction.editReply({ embeds: [offlineEmbed] });
        }

        // Update History
        updateHistory(targetUser.id, presence);

        // Data Fetching
        let activities = presence.activities || [];
        let bannerURL = null;
        let accentColor = null;

        try {
            const userProfile = await interaction.client.users.fetch(targetUser.id, { force: true });
            bannerURL = userProfile.bannerURL({ size: 1024 });
            accentColor = userProfile.accentColor;
        } catch { /* ignore */ }

        // Sort Activities
        activities = sortActivities(activities);

        const tempId = `${interaction.channelId}-${Date.now()}`;
        viewModes.set(tempId, 'full');

        // Build Initial Embed
        const embed = await buildSmartEmbed(
            interaction, targetUser, member, presence, activities, bannerURL, accentColor, 'full', 'all', 0
        );

        // --- Components Setup ---
        const row1 = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('activity_select')
                .setPlaceholder('🎛️ Filter Activity View')
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('All Activities')
                        .setValue('all')
                        .setDescription('Show complete data')
                        .setEmoji('📋'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Deep Scan')
                        .setValue('deep')
                        .setDescription('Permissions & Account Age')
                        .setEmoji('🔬'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Compact View')
                        .setValue('compact')
                        .setDescription('Minimal data')
                        .setEmoji('📄')
                )
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('refresh').setLabel('🔄 Refresh').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setLabel('👤 Profile').setStyle(ButtonStyle.Link).setURL(`https://discord.com/users/${targetUser.id}`),
            new ButtonBuilder().setCustomId('join_position').setLabel('🚪 Join Pos').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('mutual_servers').setLabel('🤝 Mutuals').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('trust_check').setLabel('🛡️ Trust').setStyle(ButtonStyle.Success)
        );

        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('history').setLabel('📜 History').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('avatar_banner').setLabel('🖼️ Media').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('permissions').setLabel('🔑 Perms').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('more').setLabel('➕ Tools').setStyle(ButtonStyle.Primary)
        );

        const components = [row1, row2, row3];
        const message = await interaction.editReply({ embeds: [embed], components });
        
        viewModes.delete(tempId);
        viewModes.set(message.id, 'full');

        // --- State & Interval ---
        let currentFilter = 'all';
        let updates = 0;
        let interval;

        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: live ? 600000 : 300000
        });

        if (live) {
            interval = setInterval(async () => {
                try {
                    updates++;
                    const freshMember = await interaction.guild.members.fetch({ user: targetUser.id, force: true });
                    const freshPresence = freshMember.presence;

                    if (!freshPresence || freshPresence.status === 'offline') {
                        const offlineEmbed = new ()
                            .setDescription('🔴 **Target went offline.**')
                            .setColor('Red');
                        await message.edit({ embeds: [offlineEmbed], components: [] });
                        clearInterval(interval);
                        collector.stop();
                        return;
                    }

                    updateHistory(targetUser.id, freshPresence);
                    
                    const updatedEmbed = await buildSmartEmbed(
                        interaction, targetUser, freshMember, freshPresence, 
                        freshPresence.activities || [], 
                        bannerURL, accentColor, viewModes.get(message.id) || 'full', currentFilter, updates
                    );
                    
                    await message.edit({ embeds: [updatedEmbed] });

                } catch (error) {
                    console.error('Live Update Error:', error);
                    clearInterval(interval);
                }
            }, 5000);
        }

        // --- Collector Handler ---
        collector.on('collect', async i => {
            const action = i.customId;

            if (action === 'refresh') {
                await i.deferUpdate();
                await handleRefresh(i, targetUser, interaction, message, viewModes, currentFilter);
            } 
            else if (action === 'activity_select') {
                await i.deferUpdate();
                currentFilter = i.values[0];
                const currentView = viewModes.get(message.id) || 'full';
                const newEmbed = await buildSmartEmbed(
                    interaction, targetUser, member, presence, activities, bannerURL, accentColor, currentView, currentFilter, updates
                );
                await i.editReply({ embeds: [newEmbed] });
            }
            else if (action === 'join_position') {
                await i.deferReply({ ephemeral: true });
                const pos = getJoinPosition(interaction.guild, member);
                const posEmbed = new ()
                    .setTitle(`🚪 Join Position: ${targetUser.username}`)
                    .setDescription(`They were the **#${pos}** member to join this server.`)
                    .setColor('primary');
                await i.editReply({ embeds: [posEmbed] });
            }
            else if (action === 'mutual_servers') {
                await i.deferReply({ ephemeral: true });
                const mutuals = interaction.client.guilds.cache.filter(g => g.members.cache.has(targetUser.id));
                const count = mutuals.size;
                let list = mutuals.map(g => `• ${g.name}`).slice(0, 10).join('\n');
                if (count > 10) list += `\n...and ${count - 10} more.`;
                
                const mutualEmbed = new ()
                    .setTitle(`🤝 Mutual Servers`)
                    .setDescription(`I share **${count}** servers with ${targetUser.username}.\n\n${list || 'None'}`)
                    .setColor('primary');
                await i.editReply({ embeds: [mutualEmbed] });
            }
            else if (action === 'trust_check') {
                await i.deferReply({ ephemeral: true });
                const trustEmbed = buildTrustEmbed(targetUser, member);
                await i.editReply({ embeds: [trustEmbed] });
            }
            else if (action === 'permissions') {
                await i.deferReply({ ephemeral: true });
                const permEmbed = buildPermissionsEmbed(interaction, member);
                await i.editReply({ embeds: [permEmbed] });
            }
            else if (action === 'history') {
                await i.deferReply({ ephemeral: true });
                const hist = activityHistory.get(targetUser.id) || [];
                const histEmbed = new ()
                    .setTitle(`📜 Activity Timeline: ${targetUser.username}`)
                    .setDescription(buildTimelineText(hist))
                    .setColor('primary');
                await i.editReply({ embeds: [histEmbed] });
            }
            else if (action === 'avatar_banner') {
                await i.deferReply({ ephemeral: true });
                const u = await interaction.client.users.fetch(member.id, { force: true });
                const banner = u.bannerURL({ size: 1024 });
                const avatar = u.displayAvatarURL({ size: 1024 });
                const mediaEmbed = new ()
                    .setTitle(`🖼️ Media for ${u.username}`)
                    .setImage(banner || avatar)
                    .setDescription(`[Avatar URL](${avatar})\n[Banner URL](${banner || 'None'})`);
                await i.editReply({ embeds: [mediaEmbed] });
            }
            else if (action === 'more') {
                await handleMoreOptions(i, interaction, member, activities);
            }
        });

        collector.on('end', () => {
            if (interval) clearInterval(interval);
            message.edit({ components: [] }).catch(() => {});
        });
    }
};

// ================== HELPER FUNCTIONS ==================

function sortActivities(activities) {
    const priority = { [ActivityType.Playing]: 2, [ActivityType.Streaming]: 1, [ActivityType.Listening]: 0, [ActivityType.Custom]: 99 };
    return [...activities].sort((a, b) => (priority[a.type] || 50) - (priority[b.type] || 50));
}

function updateHistory(userId, presence) {
    if (!activityHistory.has(userId)) activityHistory.set(userId, []);
    const history = activityHistory.get(userId);
    history.push({
        timestamp: Date.now(),
        status: presence.status,
        activities: presence.activities?.map(a => ({ name: a.name, type: a.type }))
    });
    if (history.length > 15) history.shift();
}

function buildTimelineText(history) {
    if (!history.length) return 'No history recorded.';
    return history.map(e => {
        const time = `<t:${Math.floor(e.timestamp/1000)}:R>`;
        const emoji = e.status === 'online' ? '🟢' : e.status === 'idle' ? '🌙' : '⛔';
        const act = e.activities[0]?.name || 'Nothing';
        return `${emoji} ${time}: **${act}**`;
    }).join('\n');
}

// Safe Join Position (Uses cache to prevent crashes)
function getJoinPosition(guild, member) {
    // Sort existing cache by join date
    const sorted = [...guild.members.cache.values()]
        .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
    
    const position = sorted.findIndex(m => m.id === member.id);
    return position + 1;
}

// Trust Score Logic
function buildTrustEmbed(user, member) {
    let score = 0;
    const reasons = [];

    // 1. Account Age
    const ageDays = Math.floor((Date.now() - user.createdTimestamp) / (1000 * 60 * 60 * 24));
    if (ageDays > 365) { score += 40; reasons.push('✅ Account older than 1 year (+40)'); }
    else if (ageDays > 30) { score += 20; reasons.push('🟡 Account older than 30 days (+20)'); }
    else { score -= 50; reasons.push('⚠️ Account is very new (-50)'); }

    // 2. Avatar Check
    if (user.avatar) { score += 10; reasons.push('✅ Custom Avatar (+10)'); }
    else { score -= 10; reasons.push('⚠️ Default Avatar (-10)'); }

    // 3. Server Join Age
    if (member.joinedTimestamp) {
        const joinDays = Math.floor((Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24));
        if (joinDays > 30) { score += 15; reasons.push('✅ Server member for >30 days (+15)'); }
    }

    // 4. Status
    if (member.presence && member.presence.status !== 'offline') {
        score += 10; reasons.push('✅ Currently Active (+10)');
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    let color = 0x5865F2;
    if (score > 70) color = 0x57F287;
    else if (score < 40) color = 0xED4245;

    return new ()
        .setTitle(`🛡️ Trust Analysis: ${user.username}`)
        .setDescription(`**Trust Score: ${score}/100**`)
        .addFields({ name: 'Factors', value: reasons.join('\n') })
        .setColor(color)
        .setFooter({ text: 'Note: Automated estimate based on real data.' });
}

async function handleRefresh(i, targetUser, interaction, message, viewModes, currentFilter) {
    const freshMember = await interaction.guild.members.fetch({ user: targetUser.id, force: true });
    const freshPresence = freshMember.presence;
    
    if (!freshPresence || freshPresence.status === 'offline') {
        return i.editReply({ content: '🔴 User went offline.', embeds: [], components: [] });
    }

    updateHistory(targetUser.id, freshPresence);
    let banner = null, accent = null;
    try {
        const u = await interaction.client.users.fetch(targetUser.id, { force: true });
        banner = u.bannerURL({ size: 1024 });
        accent = u.accentColor;
    } catch {}

    const currentView = viewModes.get(message.id) || 'full';
    const refreshedEmbed = await buildSmartEmbed(
        interaction, targetUser, freshMember, freshPresence, freshPresence.activities || [], 
        banner, accent, currentView, currentFilter, 0
    );
    await i.editReply({ embeds: [refreshedEmbed] });
}

async function handleMoreOptions(i, interaction, member, activities) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('match_activity').setLabel('🤝 Find Similar').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('note').setLabel('📝 Note').setStyle(ButtonStyle.Secondary)
    );
    
    await i.reply({ content: '**Advanced Tools**', components: [row], ephemeral: true });

    const collector = i.channel.createMessageComponentCollector({ 
        filter: btn => btn.user.id === i.user.id, 
        time: 60000, 
        componentType: ComponentType.Button 
    });

    collector.on('collect', async btn => {
        await btn.deferUpdate();
        if (btn.customId === 'match_activity') {
            const actName = activities[0]?.name;
            if (!actName) return btn.editReply({ content: '❌ No activity to match.', components: [] });
            
            const members = await interaction.guild.members.fetch();
            const matches = members.filter(m => m.presence?.activities?.some(a => a.name === actName));
            const list = matches.map(m => `• ${m.user.username}`).slice(0, 10).join('\n') || 'None found';
            
            await btn.editReply({ content: `🤝 **Users also doing ${actName}:**\n${list}`, components: [] });
        }
        else if (btn.customId === 'note') {
            const modal = new ModalBuilder()
                .setCustomId('note_modal')
                .setTitle(`Note for ${member.user.username}`);
            const input = new TextInputBuilder()
                .setCustomId('note_text')
                .setLabel('Your private note')
                .setStyle(TextInputStyle.Paragraph);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await btn.showModal(modal);
        }
    });
}

function buildPermissionsEmbed(interaction, member) {
    const perms = member.permissions.toArray();
    const dangerous = ['Administrator', 'BanMembers', 'KickMembers', 'ManageChannels', 'ManageGuild', 'ManageRoles'];
    
    const dangerousPerms = perms.filter(p => dangerous.includes(p));
    const otherPerms = perms.filter(p => !dangerous.includes(p));

    const fields = [];
    if (dangerousPerms.length) {
        fields.push({ name: '⚠️ Critical Permissions', value: dangerousPerms.map(p => `• ${p}`).join('\n'), inline: false });
    }
    if (otherPerms.length) {
        fields.push({ name: '📜 Standard Permissions', value: otherPerms.slice(0, 10).map(p => `• ${p}`).join('\n'), inline: false });
    } else if (!dangerousPerms.length) {
        fields.push({ name: '📜 Standard Permissions', value: 'None', inline: false });
    }

    return new ()
        .setColor('Red')
        .setTitle(`🔑 Permissions: ${member.user.username}`)
        .addFields(fields)
        .setTimestamp();
}

// ================== SMART EMBED BUILDER ==================

async function buildSmartEmbed(interaction, targetUser, member, presence, activities, bannerURL, accentColor, viewMode, filter, updateCount) {
    // Fix: Ensure color is always valid
    let color = member.displayHexColor !== '#000000' ? member.displayHexColor : (accentColor || 0x5865F2);
    
    const spotify = activities.find(a => a.name === 'Spotify');
    if (spotify) color = 0x1DB954; // Spotify Green

    const statusEmoji = presence.status === 'online' ? '🟢' : presence.status === 'idle' ? '🌙' : presence.status === 'dnd' ? '⛔' : '⚫';
    const clientStatus = presence.clientStatus ? 
        Object.keys(presence.clientStatus).map(k => k === 'desktop' ? '🖥️' : k === 'mobile' ? '📱' : '🌐').join(' ') : '❓';

    let thumbnail = targetUser.displayAvatarURL({ dynamic: true, size: 512 });

    // ----- Deep Scan vs Standard -----
    if (filter === 'deep') {
        const permCount = member.permissions.toArray().length;
        const ageDays = Math.floor((Date.now() - targetUser.createdTimestamp) / (1000 * 60 * 60 * 24));
        
        return new ()
            .setTitle(`🔬 Deep Scan: ${targetUser.username}`)
            .setColor(color)
            .setThumbnail(thumbnail)
            .setDescription(`**System Analysis**\n🆔 **ID:** ${targetUser.id}\n📆 **Account Age:** ${ageDays} days old`)
            .addFields(
                { name: '🔑 Permissions', value: `${permCount} Permissions`, inline: true },
                { name: '🛡️ Security', value: targetUser.bot ? '🤖 Bot Account' : '👤 Human', inline: true },
                { name: '📅 Join Date', value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : 'Unknown', inline: true }
            )
            .setImage(bannerURL)
            .setFooter({ text: `Telemetry v2.0 • Secure Mode` });
    }

    // ----- Standard / Compact Mode -----
    const fields = [];

    // 1. Profile Info
    fields.push({
        name: `👤 Profile ${statusEmoji}`,
        value: `${clientStatus} **${presence.status.toUpperCase()}**\n📅 Created <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>\n📥 Joined ${member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : 'N/A'}`,
        inline: true
    });

    // 2. Voice Info
    if (member.voice?.channel) {
        const v = member.voice;
        let vInfo = `🔊 **${v.channel.name}**\n`;
        if (v.streaming) vInfo += '📺 Streaming • ';
        if (v.selfVideo) vInfo += '📹 Video • ';
        if (v.selfMute || v.serverMute) vInfo += '🔇 Muted';
        
        fields.push({ name: 'Voice State', value: vInfo, inline: true });
    } else {
        fields.push({ name: 'Voice State', value: 'Not connected', inline: true });
    }

    // 3. Activities
    if (spotify) {
        const track = spotify.details || 'Unknown';
        const artist = spotify.state || 'Unknown';
        const album = spotify.assets?.largeText || 'Unknown';
        const url = `https://open.spotify.com/track/${spotify.syncId || ''}`;
        
        let progress = '';
        if (spotify.timestamps?.start && spotify.timestamps?.end) {
            const dur = spotify.timestamps.end - spotify.timestamps.start;
            const passed = Date.now() - spotify.timestamps.start;
            const percent = Math.min(Math.floor((passed / dur) * 100), 100);
            progress = `\`${createProgressBar(percent)}\` **${percent}%**`;
        }

        fields.push({
            name: '🎵 Listening to Spotify',
            value: `**[${track}](${url})**\nBy **${artist}**\nOn **${album}**\n${progress}`,
            inline: false
        });

        if (spotify.assets?.largeImage) {
            const imgId = spotify.assets.largeImage.split(':')[1];
            if (imgId) thumbnail = `https://i.scdn.co/image/${imgId}`;
        }
    } else {
        activities.slice(0, 3).forEach(act => {
            if (act.type === ActivityType.Custom) {
                const emoji = act.emoji ? `<${act.emoji.animated ? 'a' : ''}:${act.emoji.name}:${act.emoji.id}>` : '';
                fields.push({ name: '💬 Custom Status', value: `${emoji} ${act.state || ' '}`, inline: false });
            } else {
                const typeStr = Object.keys(ActivityType).find(k => ActivityType[k] === act.type) || 'Playing';
                let val = `**${act.name}**`;
                if (act.details) val += `\n📝 ${act.details}`;
                if (act.state) val += `\n📍 ${act.state}`;
                
                fields.push({ name: `🎮 ${typeStr}`, value: val, inline: false });
            }
        });
    }

    if (viewMode === 'compact') {
        while (fields.length > 2) fields.pop();
    }

    const embed = new ()
        .setTitle(`🛰️ Telemetry: ${targetUser.username}`)
        .setURL(`https://discord.com/users/${targetUser.id}`)
        .setColor(color)
        .setThumbnail(thumbnail)
        .addFields(fields)
        .setImage(bannerURL)
        .setFooter({ text: `Update #${updateCount} • Mode: ${viewMode.toUpperCase()}` })
        .setTimestamp();

    return embed;
}

function createProgressBar(percent, length = 15) {
    const filled = Math.round((percent / 100) * length);
    const empty = length - filled;
    return '▇'.repeat(filled) + '—'.repeat(empty);
}
