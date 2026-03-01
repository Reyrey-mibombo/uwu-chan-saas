const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('workforce_hub')
        .setDescription('Zenith Apex: Unified Strategic Workforce Control Portal'),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Zenith License Guard
            const license = await validatePremiumLicense(interaction);
            if (!license.allowed) {
                return interaction.editReply({ embeds: [license.embed], components: license.components });
            }

            const embed = await createCustomEmbed(interaction, {
                title: '🏢 Zenith Workforce Apex: Command Portal',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🚀 Strategic Personnel Nexus\nUnified administrative interface for the **${interaction.guild.name}** sector. Access high-fidelity telemetry and personnel optimization matrices through the authorized terminal below.\n\n**💎 ZENITH APEX EXCLUSIVE**`,
                fields: [
                    { name: '📊 Optimizer', value: 'Predictive modeling & Velocity forensics', inline: true },
                    { name: '📈 Efficiency', value: 'Spectral progress gauges & Yield metrics', inline: true },
                    { name: '🗂️ Dossiers', value: 'High-fidelity identity verification', inline: true },
                    { name: '⚖️ Intelligence Tier', value: '`PLATINUM [APEX]`', inline: true },
                    { name: '🛡️ Sector Guard', value: '`ACTIVE`', inline: true },
                    { name: '🔄 Syncing', value: '`REAL-TIME`', inline: true }
                ],
                footer: 'Zenith Apex Workforce Orchestration • V3 Strategic Suite',
                color: 'premium'
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('v3_optimizer').setLabel('Optimizer').setStyle(ButtonStyle.Primary).setEmoji('📊'),
                new ButtonBuilder().setCustomId('v3_efficiency').setLabel('Efficiency').setStyle(ButtonStyle.Secondary).setEmoji('📈'),
                new ButtonBuilder().setCustomId('v3_dossiers').setLabel('Dossiers').setStyle(ButtonStyle.Secondary).setEmoji('🗂️')
            );

            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Workforce Hub Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Nexus failure: Unable to synchronize Workforce Command Portal.')] });
        }
    }
};
