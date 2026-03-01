const { SlashCommandBuilder, EmbedBuilder, ActivityType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check_activity')
        .setDescription('Check the real-time activity and status of a user.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user you want to check')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('target') || interaction.user;
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
                .setFooter({ text: `Checked by ${interaction.user.tag}` })
                .setTimestamp();

            return interaction.editReply({ embeds: [offlineEmbed] });
        }

        const activities = presence.activities;

        // Online but no activity
        if (!activities || activities.length === 0) {
            const noActivityEmbed = new EmbedBuilder()
                .setColor('#43b581')
                .setAuthor({ 
                    name: `${targetUser.tag}'s Status`, 
                    iconURL: targetUser.displayAvatarURL({ dynamic: true }) 
                })
                .setDescription(`🟢 This user is currently **${presence.status.toUpperCase()}**, but isn't engaged in any activities.`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
                .setFooter({ text: `Checked by ${interaction.user.tag}` })
                .setTimestamp();

            return interaction.editReply({ embeds: [noActivityEmbed] });
        }

        // Status colors and emojis
        const statusColors = {
            online: '#43b581',
            idle: '#faa61a',
            dnd: '#f04747',
        };
        const statusEmojis = {
            online: '🟢',
            idle: '🟠',
            dnd: '🔴',
        };

        const embed = new EmbedBuilder()
            .setColor(statusColors[presence.status] || '#2b2d31')
            .setAuthor({ 
                name: `${targetUser.tag}'s Real-Time Activity ${statusEmojis[presence.status] || ''}`, 
                iconURL: targetUser.displayAvatarURL({ dynamic: true }) 
            })
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .setFooter({ text: `Status: ${presence.status.toUpperCase()} • Checked by ${interaction.user.tag}` })
            .setTimestamp();

        let hasImageSet = false;

        activities.forEach((activity) => {
            let activityString = '';
            let fieldName = activity.name;
            let activityEmoji = '';

            switch (activity.type) {
                case ActivityType.Playing:
                    activityEmoji = '🎮';
                    activityString = `${activityEmoji} **Playing:** ${activity.name}`;
                    break;

                case ActivityType.Streaming:
                    activityEmoji = '📺';
                    activityString = activity.url
                        ? `${activityEmoji} **Streaming:** [${activity.name}](${activity.url})`
                        : `${activityEmoji} **Streaming:** ${activity.name}`;
                    break;

                case ActivityType.Listening:
                    activityEmoji = '🎧';
                    if (activity.name === 'Spotify') {
                        fieldName = '🎵 Spotify';
                        let track = activity.details || 'Unknown Track';
                        let artist = activity.state || 'Unknown Artist';
                        let album = activity.assets?.largeText || 'Unknown Album';
                        activityString = `${activityEmoji} **Listening to:** ${track}\n👤 **Artist:** ${artist}\n💿 **Album:** ${album}`;

                        if (activity.assets?.largeImage && !hasImageSet) {
                            const imageId = activity.assets.largeImage.split(':').pop();
                            if (imageId) {
                                embed.setImage(`https://i.scdn.co/image/${imageId}`);
                                hasImageSet = true;
                            }
                        }
                    } else {
                        activityString = `${activityEmoji} **Listening to:** ${activity.name}`;
                    }
                    break;

                case ActivityType.Watching:
                    activityEmoji = '👀';
                    activityString = `${activityEmoji} **Watching:** ${activity.name}`;
                    break;

                case ActivityType.Competing:
                    activityEmoji = '🏆';
                    activityString = `${activityEmoji} **Competing in:** ${activity.name}`;
                    break;

                case ActivityType.Custom:
                    activityEmoji = '💬';
                    let emojiText = '';
                    if (activity.emoji) {
                        emojiText = activity.emoji.id
                            ? `<${activity.emoji.animated ? 'a' : ''}:${activity.emoji.name}:${activity.emoji.id}> `
                            : `${activity.emoji.name} `;
                    }
                    const state = activity.state || '';
                    activityString = `${activityEmoji} ${emojiText}${state}`.trim();
                    if (!activityString.replace(activityEmoji, '').trim()) {
                        activityString = `${activityEmoji} No custom status set.`;
                    }
                    fieldName = '💬 Custom Status';
                    break;
            }

            // Append details/state for non-custom, non-Spotify activities
            if (activity.type !== ActivityType.Custom && activity.name !== 'Spotify') {
                if (activity.details) {
                    activityString += `\n📝 **Details:** ${activity.details}`;
                }
                if (activity.state) {
                    activityString += `\n🔹 **State:** ${activity.state}`;
                }
            }

            // Timestamps (using .getTime() for clarity)
            if (activity.timestamps?.start) {
                const start = Math.floor(activity.timestamps.start.getTime() / 1000);
                activityString += `\n⏱️ **Started:** <t:${start}:R>`;
            }

            // Party info
            if (activity.party?.size) {
                activityString += `\n👥 **Party:** ${activity.party.size[0]}/${activity.party.size[1]}`;
            }

            // Game activity image
            if (activity.assets?.largeImage && !hasImageSet && activity.type !== ActivityType.Custom && activity.name !== 'Spotify') {
                const imageUrl = `https://cdn.discordapp.com/app-assets/${activity.applicationId}/${activity.assets.largeImage}.png`;
                embed.setImage(imageUrl);
                hasImageSet = true;
            }

            embed.addFields({
                name: fieldName.length > 256 ? fieldName.substring(0, 253) + '...' : fieldName,
                value: activityString.substring(0, 1024) || 'No detailed data available.',
                inline: false
            });
        });

        if (!hasImageSet) {
            embed.setImage(null);
        }

        await interaction.editReply({ embeds: [embed] });
    }
};