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
        // Defer the reply to give the bot up to 15 minutes to process
        await interaction.deferReply();

        // Determine target user
        const targetUser = interaction.options.getUser('target') |

| interaction.user;
        
        // Fetch the genuine GuildMember object
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return interaction.editReply("Could not resolve that user in this server.");
        }

        const presence = member.presence;

        // Handle completely offline or invisible users
        if (!presence |

| presence.status === 'offline' |
| presence.status === 'invisible') {
            const offlineEmbed = new EmbedBuilder()
              .setColor('#747f8d')
              .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL() })
              .setDescription('This user is currently offline, invisible, or has their activity privacy settings enabled.');
            
            return interaction.editReply({ embeds: [offlineEmbed] });
        }

        const activities = presence.activities;

        // Handle users who are online but have no active status or games
        if (!activities |

| activities.length === 0) {
            const noActivityEmbed = new EmbedBuilder()
              .setColor('#43b581')
              .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL() })
              .setDescription(`This user is currently **${presence.status}**, but isn't playing any games or doing any activities.`);
            
            return interaction.editReply({ embeds: [noActivityEmbed] });
        }

        // Dynamic embed color based on exact operational status
        const statusColors = {
            online: '#43b581',
            idle: '#faa61a',
            dnd: '#f04747',
        };

        const embed = new EmbedBuilder()
          .setColor(statusColors[presence.status] |

| '#2b2d31')
          .setAuthor({ name: `${targetUser.tag}'s Real-Time Activity`, iconURL: targetUser.displayAvatarURL() })
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
          .setFooter({ text: `Status: ${presence.status.toUpperCase()}` })
          .setTimestamp();

        // Process strictly real activity data
        activities.forEach((activity) => {
            let activityString = '';

            switch (activity.type) {
                case ActivityType.Playing:
                    activityString = `**Playing:** ${activity.name}`;
                    break;
                case ActivityType.Streaming:
                    // Strictly uses the real URL provided by the Discord API. No fake fallbacks.
                    activityString = activity.url 
                       ? `**Streaming:** [${activity.name}](${activity.url})` 
                        : `**Streaming:** ${activity.name}`;
                    break;
                case ActivityType.Listening:
                    activityString = `**Listening to:** ${activity.name}`;
                    break;
                case ActivityType.Watching:
                    activityString = `**Watching:** ${activity.name}`;
                    break;
                case ActivityType.Competing:
                    activityString = `**Competing in:** ${activity.name}`;
                    break;
                case ActivityType.Custom:
                    const emoji = activity.emoji? (activity.emoji.id? `<${activity.emoji.animated? 'a' : ''}:${activity.emoji.name}:${activity.emoji.id}> ` : `${activity.emoji.name} `) : '';
                    activityString = `${emoji}${activity.state |

| ''}`;
                    break;
            }

            // Append real Rich Presence details
            if (activity.details && activity.type!== ActivityType.Custom) {
                activityString += `\n**Details:** ${activity.details}`;
            }
            if (activity.state && activity.type!== ActivityType.Custom) {
                activityString += `\n**State:** ${activity.state}`;
            }

            // Calculate exact epoch timestamps
            if (activity.timestamps && activity.timestamps.start) {
                const elapsed = Math.floor(activity.timestamps.start.getTime() / 1000);
                activityString += `\n**Time Elapsed:** <t:${elapsed}:R>`;
            }

            embed.addFields({ 
                name: activity.type === ActivityType.Custom? 'Custom Status' : activity.name, 
                value: activityString |

| 'No detailed data available.',
                inline: false 
            });
        });

        await interaction.editReply({ embeds: [embed] });
    }
};