const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('staff_settings')
        .setDescription('🎨 Personalize your staff identity and tactical themes')
        .addStringOption(opt => opt.setName('tagline').setDescription('Set your personal staff bio/tagline').setMaxLength(100))
        .addStringOption(opt => opt.setName('color').setDescription('Set your profile accent color (Hex, e.g. #FF0000)')),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            const tagline = interaction.options.getString('tagline');
            const color = interaction.options.getString('color');
            const guildId = interaction.guildId;

            let userData = await User.findOne({ userId: interaction.user.id, guildId });
            if (!userData || !userData.staff) {
                return interaction.editReply({ embeds: [createErrorEmbed('No staff profile detected to customize.')] });
            }

            const updates = [];
            if (tagline !== null) {
                userData.staff.tagline = tagline;
                updates.push('Tagline calibrated');
            }
            if (color !== null) {
                // Simple hex validation
                if (/^#[0-9A-F]{6}$/i.test(color)) {
                    userData.staff.profileColor = color;
                    updates.push('Accent color updated');
                } else {
                    return interaction.editReply({ embeds: [createErrorEmbed('Invalid hex color format. Use e.g. `#FF0000`')] });
                }
            }

            if (updates.length === 0) {
                return interaction.editReply({ content: 'No calibration changes requested.' });
            }

            await userData.save();

            const embed = await createCustomEmbed(interaction, {
                title: '🎨 Profile Calibration Complete',
                description: `### 🛡️ Tactical Identity Synchronized\nYour personalized staff themes have been successfully recorded for the **${interaction.guild.name}** sector.\n\n**Applied Changes:**\n${updates.map(u => `➔ ${u}`).join('\n')}`,
                color: userData.staff.profileColor || 'success'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Staff Settings Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Failed to synchronize personnel settings.')] });
        }
    }
};
