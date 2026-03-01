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
                title: '🏢 Zenith Workforce Hyper-Apex: Command Nexus',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🚀 Macroscopic Personnel Orchestration\nUnified administrative interface for the **${interaction.guild.name}** sector. Access high-fidelity telemetry, collaborative synergy, and tactical proficiency matrices.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '📊 Optimizer', value: 'Predictive modeling & Velocity', inline: true },
                    { name: '🤝 Synergy', value: 'Collaborative resonance ribbons', inline: true },
                    { name: '🌌 Skill Tree', value: 'Proficiency & Specialization mapping', inline: true },
                    { name: '🌐 Global Benchmark', value: '`🟢 TOP 5% SIGNAL YIELD`', inline: true },
                    { name: '✨ Visual Tier', value: '`PLATINUM [HYPER-APEX]`', inline: true },
                    { name: '🛡️ Sector Guard', value: '`ZENITH-SYNC ACTIVE`', inline: true }
                ],
                footer: 'Zenith Hyper-Apex Workforce Orchestration • V3 Strategic Suite',
                color: 'premium'
            });

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('v3_optimizer').setLabel('Optimizer').setStyle(ButtonStyle.Primary).setEmoji('📊'),
                new ButtonBuilder().setCustomId('v3_synergy').setLabel('Team Synergy').setStyle(ButtonStyle.Primary).setEmoji('🤝'),
                new ButtonBuilder().setCustomId('v3_efficiency').setLabel('Efficiency').setStyle(ButtonStyle.Secondary).setEmoji('📈')
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('v3_skills').setLabel('Skill Tree').setStyle(ButtonStyle.Secondary).setEmoji('🌌'),
                new ButtonBuilder().setCustomId('v3_dossiers').setLabel('Dossiers').setStyle(ButtonStyle.Secondary).setEmoji('🗂️')
            );

            await interaction.editReply({ embeds: [embed], components: [row1, row2] });

        } catch (error) {
            console.error('Workforce Hub Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Nexus failure: Unable to synchronize Workforce Command Portal.')] });
        }
    }
};
