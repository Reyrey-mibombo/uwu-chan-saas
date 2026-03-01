const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('badges')
        .setDescription('🏅 View your personal achievement badges and merits')
        .addUserOption(opt => opt.setName('user').setDescription('Staff member (Optional)')),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const targetUser = interaction.options.getUser('user') || interaction.user;

            const userData = await User.findOne({ userId: targetUser.id, guildId: interaction.guildId }).lean();

            if (!userData || !userData.staff || !userData.staff.achievements || userData.staff.achievements.length === 0) {
                const embed = await createCustomEmbed(interaction, {
                    title: '🏅 Personnel Badge Registry',
                    description: `<@${targetUser.id}> currently holds no official badges in this sector.`,
                    footer: 'Achievements can be awarded by server administrators.'
                });
                return interaction.editReply({ embeds: [embed] });
            }

            const badges = userData.staff.achievements.map(a => {
                let icon = '🎖️';
                if (a.includes('Staff of the Month')) icon = '🌟';
                if (a.includes('Moderator')) icon = '🛡️';
                if (a.includes('Slayer')) icon = '⚔️';
                if (a.includes('Legend')) icon = '👑';
                return `${icon} **${a}**`;
            }).join('\n');

            const embed = await createCustomEmbed(interaction, {
                title: `🏅 Personnel Badge Registry: ${targetUser.username}`,
                thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
                description: `Official merits and achievements awarded for service within **${interaction.guild.name}**.\n\n${badges}`,
                footer: 'Each badge represents a significant operational milestone.',
                color: 'premium'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Badges Command Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Failed to query the badge registry.')] });
        }
    }
};
