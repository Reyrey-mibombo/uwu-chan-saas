const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('staff_hub')
        .setDescription('🕹️ Access the interactive Staff Control Center dashboard'),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const embed = await createCustomEmbed(interaction, {
                title: '🕹️ Strategic Staff Control Center',
                description: `### 🛡️ Authorized Access: ${interaction.user.username}\nWelcome to the unified terminal for **${interaction.guild.name}**. Select an operational module from the interface below to view localized telemetry.`,
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                fields: [
                    { name: '📇 Identity', value: 'View Passport & Merits', inline: true },
                    { name: '📈 Analytics', value: 'Check Promotion Status', inline: true },
                    { name: '📋 Registry', value: 'View Active Objectives', inline: true }
                ],
                footer: 'Unified Operational Interface • V2 Enterprise',
                color: 'premium'
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('hub_identity')
                    .setLabel('View Identity')
                    .setEmoji('📇')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('hub_promo')
                    .setLabel('Promotion Analytics')
                    .setEmoji('📈')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('hub_tasks')
                    .setLabel('Active Objectives')
                    .setEmoji('📋')
                    .setStyle(ButtonStyle.Secondary)
            );

            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Staff Hub Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Failed to initialize the control center terminal.')] });
        }
    }
};
