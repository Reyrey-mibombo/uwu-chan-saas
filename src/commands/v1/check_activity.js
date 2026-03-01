const { SlashCommandBuilder, EmbedBuilder, ActivityType } = require('discord.js');

// Requires intents: GuildPresences, GuildMembers, Guilds

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check_activity')
        .setDescription('Check the real-time activity and status of a user.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user you want to check')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('live')
                .setDescription('Enable live updates (every 5s for 1 minute)')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('target') || interaction.user;
        const live = interaction.options.getBoolean('live') ?? true; // default to true
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return interaction.editReply('❌ Could not find that user in this server.');
        }

        const presence = member.presence;

        // Offline check (invisible is reported as 'offline')
        if (!presence || presence.status === 'offline') {
            const offlineEmbed = new EmbedBuilder()
                .setColor('#747f8d')
                .setAuthor({
                    name: `${targetUser.tag} is Offline`,
                    iconURL: targetUser.displayAvatarURL({ dynamic: true })
                })
                .setDescription('🔒 This user is currently offline, invisible, or has their activity privacy settings enabled.')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
                .setFooter({ text: `Checked by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.editReply({ embeds: [offlineEmbed] });
        }

        let activities = presence.activities || [];

        // Priority sort: Spotify > Playing > Streaming > Watching > Competing > Other listening > Custom (lowest)
        const priorityMap = {
            [ActivityType.Playing]: 2,
            [ActivityType.Streaming]: 3,
            [ActivityType.Watching]: 4,
            [ActivityType.Competing]: 5,
            [ActivityType.Listening]: 6,
            [ActivityType.Custom]: 10
        };
        activities = [...activities].sort((a, b) => {
            const getPriority = (act) => {
                if (act.name === 'Spotify') return 1;
                return priorityMap[act.type] || 7;
            };
            return getPriority(a) - getPriority(b);
        });

        const embed = buildEmbed(interaction, targetUser, presence, activities);
        const message = await interaction.editReply({ embeds: [embed] });

        // Live updates (if enabled)
        if (!live) return;

        let updates = 0;
        const maxUpdates = 12; // 60 seconds total
        const interval = setInterval(async () => {
            try {
                updates++;
                if (updates >= maxUpdates) {
                    clearInterval(interval);
                    return;
                }

                const freshMember = await interaction.guild.members.fetch(targetUser.id);
                const freshPresence = freshMember.presence;

                // If user went offline, show offline embed and stop
                if (!freshPresence || freshPresence.status === 'offline') {
                    const offlineEmbed = new EmbedBuilder()
                        .setColor('#747f8d')
                        .setAuthor({ name: `${targetUser.tag} is Offline`, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
                        .setDescription('🔒 User went offline during live tracking.')
                        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
                        .setFooter({ text: `Tracking stopped at ${new Date().toLocaleTimeString()}` })
                        .setTimestamp();
                    await message.edit({ embeds: [offlineEmbed] });
                    clearInterval(interval);
                    return;
                }

                let freshActivities = freshPresence.activities || [];

                // If no activities, show "no activity" embed and stop (or you could continue polling)
                if (!freshActivities.length) {
                    const noActivityEmbed = new EmbedBuilder()
                        .setColor('#43b581')
                        .setAuthor({ name: `${targetUser.tag}'s Status`, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
                        .setDescription(`🟢 This user is currently online but has no active activities.`)
                        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
                        .setFooter({ text: `Checked by ${interaction.user.tag}` })
                        .setTimestamp();
                    await message.edit({ embeds: [noActivityEmbed] });
                    clearInterval(interval);
                    return;
                }

                // Re‑sort activities
                freshActivities = [...freshActivities].sort((a, b) => {
                    const getPriority = (act) => {
                        if (act.name === 'Spotify') return 1;
                        return priorityMap[act.type] || 7;
                    };
                    return getPriority(a) - getPriority(b);
                });

                const updatedEmbed = buildEmbed(interaction, targetUser, freshPresence, freshActivities);
                await message.edit({ embeds: [updatedEmbed] });

            } catch {
                clearInterval(interval);
            }
        }, 5000);
    }
};

// Helper: create a text progress bar
function createProgressBar(percent, length = 10) {
    const filled = Math.round((percent / 100) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

// Main embed builder
function buildEmbed(interaction, targetUser, presence, activities) {
    const statusColors = {
        online: '#43b581',
        idle: '#faa61a',
        dnd: '#f04747',
    };

    const embed = new EmbedBuilder()
        .setColor(statusColors[presence.status] || '#2b2d31')
        .setAuthor({
            name: `${targetUser.tag} • ${presence.status.toUpperCase()}`,
            iconURL: targetUser.displayAvatarURL({ dynamic: true })
        })
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
        .setFooter({ text: `Checked by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    // Device info
    if (presence.clientStatus) {
        const devices = [];
        if (presence.clientStatus.desktop) devices.push('🖥️ Desktop');
        if (presence.clientStatus.mobile) devices.push('📱 Mobile');
        if (presence.clientStatus.web) devices.push('🌐 Web');
        if (devices.length) {
            embed.setDescription(`**Connected from:** ${devices.join(' • ')}`);
        }
    }

    let hasImageSet = false;

    for (const activity of activities) {
        let activityString = '';
        let fieldName = activity.name;

        switch (activity.type) {
            case ActivityType.Playing:
                activityString = `🎮 **Playing:** ${activity.name}`;
                break;

            case ActivityType.Streaming:
                if (activity.url) {
                    activityString = `📺 **Streaming:** [${activity.name}](${activity.url})`;
                } else {
                    activityString = `📺 **Streaming:** ${activity.name}`;
                }
                break;

            case ActivityType.Listening:
                if (activity.name === 'Spotify') {
                    fieldName = '🎵 Spotify';
                    const track = activity.details || 'Unknown Track';
                    const artist = activity.state || 'Unknown Artist';
                    const album = activity.assets?.largeText || 'Unknown Album';
                    activityString = `🎧 **Listening to:** ${track}\n👤 **Artist:** ${artist}\n💿 **Album:** ${album}`;

                    // Spotify album art
                    if (activity.assets?.largeImage && !hasImageSet) {
                        const imageId = activity.assets.largeImage.split(':').pop();
                        if (imageId) {
                            embed.setImage(`https://i.scdn.co/image/${imageId}`);
                            hasImageSet = true;
                        }
                    }
                } else {
                    activityString = `🎧 **Listening to:** ${activity.name}`;
                }
                break;

            case ActivityType.Watching:
                activityString = `👀 **Watching:** ${activity.name}`;
                break;

            case ActivityType.Competing:
                activityString = `🏆 **Competing in:** ${activity.name}`;
                break;

            case ActivityType.Custom:
                fieldName = '💬 Custom Status';
                const emoji = activity.emoji
                    ? (activity.emoji.id
                        ? `<${activity.emoji.animated ? 'a' : ''}:${activity.emoji.name}:${activity.emoji.id}>`
                        : activity.emoji.name)
                    : '';
                const state = activity.state || '';
                // Combine emoji and state without extra spaces
                const parts = [];
                if (emoji) parts.push(emoji);
                if (state) parts.push(state);
                activityString = parts.join(' ') || '💬 No custom status set.';
                break;

            default:
                activityString = `🎯 **Activity:** ${activity.name}`;
        }

        // Append rich presence details/state (if not already handled)
        if (activity.type !== ActivityType.Custom && activity.name !== 'Spotify') {
            if (activity.details) {
                activityString += `\n📝 **Details:** ${activity.details}`;
            }
            if (activity.state) {
                activityString += `\n🔹 **State:** ${activity.state}`;
            }
        }

        // Timestamps and progress bar
        if (activity.timestamps) {
            const start = activity.timestamps.start ? activity.timestamps.start.getTime() : null;
            const end = activity.timestamps.end ? activity.timestamps.end.getTime() : null;
            const now = Date.now();

            if (start && end && end > now) {
                // Activity with duration (e.g., song, game match)
                const total = end - start;
                const elapsed = now - start;
                if (elapsed > 0 && elapsed < total) {
                    const percent = (elapsed / total) * 100;
                    const bar = createProgressBar(percent, 10);
                    activityString += `\n⏳ **Progress:** ${bar} ${Math.round(percent)}%`;
                }
                activityString += `\n⏱️ **Started:** <t:${Math.floor(start / 1000)}:R>`;
                activityString += `\n⌛ **Ends:** <t:${Math.floor(end / 1000)}:R>`;
            } else if (start) {
                // Only start time (elapsed)
                activityString += `\n⏱️ **Started:** <t:${Math.floor(start / 1000)}:R>`;
            }
        }

        // Party info (e.g., game party size)
        if (activity.party?.size) {
            activityString += `\n👥 **Party:** ${activity.party.size[0]}/${activity.party.size[1]}`;
        }

        // Game/activity image (if not set yet)
        if (activity.applicationId && activity.assets?.largeImage && !hasImageSet && activity.name !== 'Spotify') {
            const imageUrl = `https://cdn.discordapp.com/app-assets/${activity.applicationId}/${activity.assets.largeImage}.png`;
            embed.setImage(imageUrl);
            hasImageSet = true;
        }

        // Add field (truncate if needed)
        embed.addFields({
            name: fieldName.length > 256 ? fieldName.slice(0, 253) + '...' : fieldName,
            value: activityString.slice(0, 1024) || 'No data available.',
            inline: false
        });
    }

    // If no image was set, ensure it's cleared
    if (!hasImageSet) {
        embed.setImage(null);
    }

    return embed;
}