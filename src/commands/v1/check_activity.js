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

        // Target user (fallback to command user)
        const targetUser = interaction.options.getUser('target') || interaction.user;

        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) {
            return interaction.editReply("Could not resolve that user in this server.");
        }

        const presence = member.presence;

        // Handle offline / invisible / no presence
        if (!presence || presence.status === 'offline' || presence.status === 'invisible') {
            const offlineEmbed = new EmbedBuilder()
                .setColor('#747f8d')
                .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL() })
                .setDescription('This user is currently offline, invisible, or has their activity privacy settings enabled.');

            return interaction.editReply({ embeds: [offlineEmbed] });
        }

        const activities = presence.activities;

        // Online but no activities
        if (!activities || activities.length === 0) {
            const noActivityEmbed = new EmbedBuilder()
                .setColor('#43b581')
                .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL() })
                .setDescription(`This user is currently **${presence.status}**, but isn't playing any games or doing any activities.`);

            return interaction.editReply({ embeds: [noActivityEmbed] });
        }

        const statusColors = {
            online: '#43b581',
            idle: '#faa61a',
            dnd: '#f04747',
        };

        const embed = new EmbedBuilder()
            .setColor(statusColors[presence.status] || '#2b2d31')
            .setAuthor({ name: `${targetUser.tag}'s Real-Time Activity`, iconURL: targetUser.displayAvatarURL() })
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .setFooter({ text: `Status: ${presence.status.toUpperCase()}` })
            .setTimestamp();

        activities.forEach((activity) => {
            let activityString = '';

            switch (activity.type) {
                case ActivityType.Playing:
                    activityString = `**Playing:** ${activity.name}`;
                    break;
                case ActivityType.Streaming:
                    activityString = activity.url
                        ? `**Streaming:** [\( {activity.name}]( \){activity.url})`
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
                    const emoji = activity.emoji
                        ? (activity.emoji.id
                            ? `<\( {activity.emoji.animated ? 'a' : ''}: \){activity.emoji.name}:${activity.emoji.id}> `
                            : `${activity.emoji.name} `)
                        : '';
                    activityString = `\( {emoji} \){activity.state || ''}`;
                    break;
            }

            // Rich Presence details (skip for Custom Status)
            if (activity.details && activity.type !== ActivityType.Custom) {
                activityString += `\n**Details:** ${activity.details}`;
            }
            if (activity.state && activity.type !== ActivityType.Custom) {
                activityString += `\n**State:** ${activity.state}`;
            }

            // Fixed timestamp handling (Discord.js v14+ gives number, not Date)
            if (activity.timestamps?.start) {
                const startUnix = Math.floor(activity.timestamps.start / 1000);
                activityString += `\n**Time Elapsed:** <t:${startUnix}:R>`;
            }

            embed.addFields({
                name: activity.type === ActivityType.Custom ? 'Custom Status' : activity.name,
                value: activityString || 'No detailed data available.',
                inline: false
            });
        });

        await interaction.editReply({ embeds: [embed] });
    }
};