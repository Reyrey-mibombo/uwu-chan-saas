const { SlashCommandBuilder, EmbedBuilder, ActivityType } = require('discord.js');
const { createCustomEmbed } = require('../../utils/embeds');

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
            const offlineEmbed = await createCustomEmbed(interaction, {
                title: `${targetUser.username} is Offline`,
                description: '🔒 This user is currently offline, invisible, or has their activity privacy settings enabled.',
                thumbnail: targetUser.displayAvatarURL({ dynamic: true, size: 512 }),
                color: 'error'
            });

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

        const embed = await buildEmbed(interaction, targetUser, presence, activities);
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
                    const offlineEmbed = await createCustomEmbed(interaction, {
                        title: `${targetUser.username} is now Offline`,
                        description: '🔒 Telemetry lost. User has transitioned to an offline or invisible state.',
                        color: 'error',
                        thumbnail: targetUser.displayAvatarURL({ dynamic: true, size: 512 }),
                        footer: `Real-time tracking terminated at ${new Date().toLocaleTimeString()}`
                    });
                    await message.edit({ embeds: [offlineEmbed] });
                    clearInterval(interval);
                    return;
                }

                let freshActivities = freshPresence.activities || [];

                // If no activities, show "no activity" embed and stop
                if (!freshActivities.length) {
                    const noActivityEmbed = await createCustomEmbed(interaction, {
                        title: `${targetUser.username}'s Status`,
                        description: '🟢 Node is currently **Online** but broadcasting no active telemetry (no activities).',
                        color: 'success',
                        thumbnail: targetUser.displayAvatarURL({ dynamic: true, size: 512 }),
                        footer: `Active monitoring suspended`
                    });
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

                const updatedEmbed = await buildEmbed(interaction, targetUser, freshPresence, freshActivities);
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
async function buildEmbed(interaction, targetUser, presence, activities) {
    const { createCustomEmbed } = require('../../utils/embeds');

    const statusColors = {
        online: 'success',
        idle: 'warning',
        dnd: 'error',
    };

    let description = '';

    // Device info
    if (presence.clientStatus) {
        const devices = [];
        if (presence.clientStatus.desktop) devices.push('🖥️ Desktop');
        if (presence.clientStatus.mobile) devices.push('📱 Mobile');
        if (presence.clientStatus.web) devices.push('🌐 Web');
        if (devices.length) {
            description = `**Telemetry Source:** ${devices.join(' • ')}`;
        }
    }

    const fields = [];
    let image = null;
    let hasImageSet = false;

    for (const activity of activities) {
        let activityString = '';
        let fieldName = activity.name;

        switch (activity.type) {
            case ActivityType.Playing:
                activityString = `🎮 **Executing:** ${activity.name}`;
                break;

            case ActivityType.Streaming:
                activityString = `📺 **Streaming:** ${activity.url ? `[${activity.name}](${activity.url})` : activity.name}`;
                break;

            case ActivityType.Listening:
                if (activity.name === 'Spotify') {
                    fieldName = '🎵 Spotify Performance';
                    const track = activity.details || 'Unknown Track';
                    const artist = activity.state || 'Unknown Artist';
                    const album = activity.assets?.largeText || 'Unknown Album';
                    activityString = `🎧 **Track:** ${track}\n👤 **Artist:** ${artist}\n💿 **Album:** ${album}`;

                    if (activity.assets?.largeImage && !hasImageSet) {
                        const imageId = activity.assets.largeImage.split(':').pop();
                        if (imageId) {
                            image = `https://i.scdn.co/image/${imageId}`;
                            hasImageSet = true;
                        }
                    }
                } else {
                    activityString = `🎧 **Listening to:** ${activity.name}`;
                }
                break;

            case ActivityType.Watching:
                activityString = `👀 **Observing:** ${activity.name}`;
                break;

            case ActivityType.Competing:
                activityString = `🏆 **Competing in:** ${activity.name}`;
                break;

            case ActivityType.Custom:
                fieldName = '💬 Bio Status';
                const emoji = activity.emoji
                    ? (activity.emoji.id
                        ? `<${activity.emoji.animated ? 'a' : ''}:${activity.emoji.name}:${activity.emoji.id}>`
                        : activity.emoji.name)
                    : '';
                const state = activity.state || '';
                const parts = [];
                if (emoji) parts.push(emoji);
                if (state) parts.push(state);
                activityString = parts.join(' ') || '💬 No data broadcast.';
                break;

            default:
                activityString = `🎯 **Operation:** ${activity.name}`;
        }

        if (activity.type !== ActivityType.Custom && activity.name !== 'Spotify') {
            if (activity.details) activityString += `\n📝 **Details:** ${activity.details}`;
            if (activity.state) activityString += `\n🔹 **State:** ${activity.state}`;
        }

        if (activity.timestamps) {
            const start = activity.timestamps.start ? activity.timestamps.start.getTime() : null;
            const end = activity.timestamps.end ? activity.timestamps.end.getTime() : null;
            const now = Date.now();

            if (start && end && end > now) {
                const percent = ((now - start) / (end - start)) * 100;
                activityString += `\n⏳ **Dynamic:** ${createProgressBar(percent)} ${Math.round(percent)}%`;
                activityString += `\n⏱️ **Duration:** <t:${Math.floor(start / 1000)}:R> → <t:${Math.floor(end / 1000)}:R>`;
            } else if (start) {
                activityString += `\n⏱️ **Elapsed:** <t:${Math.floor(start / 1000)}:R>`;
            }
        }

        if (activity.party?.size) {
            activityString += `\n👥 **Party Flux:** ${activity.party.size[0]}/${activity.party.size[1]}`;
        }

        if (activity.applicationId && activity.assets?.largeImage && !hasImageSet && activity.name !== 'Spotify') {
            image = `https://cdn.discordapp.com/app-assets/${activity.applicationId}/${activity.assets.largeImage}.png`;
            hasImageSet = true;
        }

        fields.push({
            name: fieldName.length > 256 ? fieldName.slice(0, 253) + '...' : fieldName,
            value: activityString.slice(0, 1024) || 'No specific telemetry.',
            inline: false
        });
    }

    return await createCustomEmbed(interaction, {
        title: `🛰️ Telemetry: ${targetUser.username} (${presence.status.toUpperCase()})`,
        description: description,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true, size: 512 }),
        image: image,
        fields: fields,
        color: statusColors[presence.status] || 'info',
        footer: `Live data synchronization active`
    });
}