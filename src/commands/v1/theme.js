const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('theme')
        .setDescription('Customize the bot\'s embed colors for your server')
        .setDefaultMemberPermissions(8) // Administrator only
        .addStringOption(option =>
            option.setName('hex_color')
                .setDescription('The HEX color code (e.g., #FF5733) or "reset" to clear')
                .setRequired(true)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const hexColor = interaction.options.getString('hex_color').trim();

            // Handle resetting the theme
            if (hexColor.toLowerCase() === 'reset') {
                await Guild.findOneAndUpdate(
                    { guildId: interaction.guildId },
                    { $set: { 'customBranding.color': null } }
                );
                return interaction.editReply({
                    embeds: [await createCustomEmbed(interaction, {
                        title: '🎨 Theme Reset',
                        description: 'The server theme has been reset to the default bot colors.',
                        color: 'success'
                    })]
                });
            }

            // Validate HEX Color
            const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
            if (!hexRegex.test(hexColor)) {
                return interaction.editReply({
                    embeds: [createErrorEmbed('Invalid HEX color code. Please provide a valid HEX code (e.g., #FF5733).')]
                });
            }

            // Save custom theme to DB
            await Guild.findOneAndUpdate(
                { guildId: interaction.guildId },
                { $set: { 'customBranding.color': hexColor } },
                { upsert: true }
            );

            const previewEmbed = await createCustomEmbed(interaction, {
                title: '🎨 Theme Updated',
                description: `Successfully updated the server theme color to **${hexColor}**! All future bot embeds will adopt this primary color.`,
                branding: { color: hexColor }
            });

            await interaction.editReply({ embeds: [previewEmbed] });

        } catch (error) {
            console.error('Theme Command Error:', error);
            const errEmbed = createErrorEmbed('An error occurred while updating the server theme.');
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errEmbed] });
            } else {
                await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            }
        }
    }
};
