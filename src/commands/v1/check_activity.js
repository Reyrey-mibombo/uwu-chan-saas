const { SlashCommandBuilder, EmbedBuilder, ActivityType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('activity')
        .setDescription('Check a user\'s current activity and status in real-time.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to inspect (defaults to yourself)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('target') || interaction.user;
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return interaction.editReply('❌ Could not find that user in this server.');
        }

        const presence = member.presence;

        // If presence is null, the bot lacks the necessary intent or the user is offline/invisible
        if (!presence) {
            const embed = new EmbedBuilder()
                .setColor('#2f3136')
                .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL() })
                .setDescription('🔒 This user is offline, invisible, or has privacy settings enabled.\n*The bot may also need the Presence Intent enabled.*')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .setFooter({ text: 'Discord Activity Check', iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
        }

        const status = presence.status; // 'online', 'idle', 'dnd', 'offline'
        const activities = presence.activities.filter(a => a.type !== ActivityType.Custom); // Filter custom for later
        const customStatus = presence.activities.find(a => a.type === ActivityType.Custom);

        // Base embed with user info and status
        const statusColors = {
            online: 0x43b581,
            idle: 0xfaa61a,
            dnd: 0xf04747,
            offline: 0x747f8d
        };
        const embed = new EmbedBuilder()
            .setColor(statusColors[status] || 0x2b2d31)
            .setAuthor({ 
                name: `${targetUser.tag} — ${status.toUpperCase()}`,
                iconURL: targetUser.displayAvatarURL({ dynamic: true })
            })
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .setFooter({ 
                text: `Requested by ${interaction.user.tag}`, 
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        // --- Device Status (if available) ---
        if (presence.clientStatus) {
            const devices = [];
            if (presence.clientStatus.desktop) devices.push('🖥️ Desktop');
            if (presence.clientStatus.mobile) devices.push('📱 Mobile');
            if (presence.clientStatus.web) devices.push('🌐 Web');
            if (devices.length) {
                embed.addFields({ name: '📡 Connected From', value: devices.join(' • '), inline: true });
            }
        }

        // --- Custom Status (always show if present) ---
        if (customStatus) {
            let customText = '';
            if (customStatus.emoji) {
                customText += customStatus.emoji.id 
                    ? `<${customStatus.emoji.animated ? 'a' : ''}:${customStatus.emoji.name}:${customStatus.emoji.id}> `
                    : `${customStatus.emoji.name} `;
            }
            customText += customStatus.state || '';
            if (customText.trim()) {
                embed.addFields({ name: '💬 Custom Status', value: customText, inline: false });
            }
        }

        // --- Regular Activities (games, Spotify, etc.) ---
        if (activities.length === 0) {
            embed.setDescription('✨ Online but no active activity to display.');
        } else {
            activities.forEach(activity => {
                let fieldName = '';
                let fieldValue = '';

                // Format activity name with type
                switch (activity.type) {
                    case ActivityType.Playing:
                        fieldName = '🎮 Playing';
                        break;
                    case ActivityType.Streaming:
                        fieldName = '📺 Streaming';
                        break;
                    case ActivityType.Listening:
                        // Special handling for Spotify
                        if (activity.name === 'Spotify' && activity.assets && activity.assets.largeText) {
                            fieldName = '🎵 Spotify';
                        } else {
                            fieldName = '🎧 Listening';
                        }
                        break;
                    case ActivityType.Watching:
                        fieldName = '📺 Watching';
                        break;
                    case ActivityType.Competing:
                        fieldName = '🏆 Competing';
                        break;
                    default:
                        fieldName = activity.name || 'Activity';
                }

                // Build the field value
                let details = [];

                // Main title (game name, song, etc.)
                if (activity.details) {
                    details.push(`**${activity.details}**`);
                } else {
                    details.push(`**${activity.name}**`);
                }

                // State (e.g., artist, level, etc.)
                if (activity.state) {
                    details.push(`*${activity.state}*`);
                }

                // Additional rich presence fields
                if (activity.assets) {
                    if (activity.assets.largeText && activity.name !== 'Spotify') {
                        details.push(`📌 ${activity.assets.largeText}`);
                    }
                    if (activity.assets.smallText) {
                        details.push(`🔹 ${activity.assets.smallText}`);
                    }
                }

                // Party size (if available)
                if (activity.party && activity.party.size) {
                    const [current, max] = activity.party.size;
                    details.push(`👥 ${current}/${max} players`);
                }

                // Timestamps
                if (activity.timestamps) {
                    if (activity.timestamps.start) {
                        const start = Math.floor(activity.timestamps.start.getTime() / 1000);
                        details.push(`⏱️ Started <t:${start}:R>`);
                    }
                    if (activity.timestamps.end) {
                        const end = Math.floor(activity.timestamps.end.getTime() / 1000);
                        details.push(`⌛ Ends <t:${end}:R>`);
                    }
                }

                // For streaming, add the URL if present
                if (activity.type === ActivityType.Streaming && activity.url) {
                    details.push(`🔗 [Watch Stream](${activity.url})`);
                }

                fieldValue = details.join('\n') || 'No additional details.';

                embed.addFields({ name: fieldName, value: fieldValue.slice(0, 1024), inline: false });
            });
        }

        await interaction.editReply({ embeds: [embed] });
    }
};