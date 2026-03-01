const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('security_hub')
        .setDescription('Zenith Apex: Unified Guardian Command & Control Nexus'),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Zenith License Guard
            const license = await validatePremiumLicense(interaction);
            if (!license.allowed) {
                return interaction.editReply({ embeds: [license.embed], components: license.components });
            }

            const embed = await createCustomEmbed(interaction, {
                title: '🛡️ Zenith Guardian Hyper-Apex: C&C Nexus',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🌐 Macroscopic Security Orchestration\nUnified command interface for sector **${interaction.guild.name}**. Access AI-simulated threat forecasting and visual deterrence dashboards.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '🛰️ Threat Forecast', value: '48h predictive risk modeling', inline: true },
                    { name: '🛡️ Shield Status', value: 'Visual layer deterrence audit', inline: true },
                    { name: '📜 Audit Ledger', value: 'High-fidelity forensic tracing', inline: true },
                    { name: '🌐 Global Deterrence', value: '`🟢 ELITE SECTOR GUARD`', inline: true },
                    { name: '✨ Visual Tier', value: '`PLATINUM [HYPER-APEX]`', inline: true },
                    { name: '⚖️ Intelligence', value: '`SYNCHRONIZED`', inline: true }
                ],
                footer: 'Zenith Hyper-Apex Security Orchestration • V4 Guardian Suite',
                color: 'premium'
            });

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('v4_threat').setLabel('Threat Forecast').setStyle(ButtonStyle.Primary).setEmoji('🔮'),
                new ButtonBuilder().setCustomId('v4_shields').setLabel('Shield Status').setStyle(ButtonStyle.Primary).setEmoji('🛡️'),
                new ButtonBuilder().setCustomId('v4_antispam').setLabel('Anti-Spam').setStyle(ButtonStyle.Secondary).setEmoji('🗂️')
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('v4_analytics').setLabel('Security Analytics').setStyle(ButtonStyle.Secondary).setEmoji('📈'),
                new ButtonBuilder().setCustomId('v4_audit').setLabel('Audit Ledger').setStyle(ButtonStyle.Secondary).setEmoji('📜')
            );

            await interaction.editReply({ embeds: [embed], components: [row1, row2] });

        } catch (error) {
            console.error('Security Hub Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Nexus failure: Unable to synchronize Guardian Command Nexus.')] });
        }
    }
};
