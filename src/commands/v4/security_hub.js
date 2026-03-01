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
                title: '🛡️ Zenith Guardian Apex: C&C Nexus',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🌐 Macroscopic Security Orchestration\nUnified command interface for sector **${interaction.guild.name}**. Access global threat intelligence and real-time neutralization protocols.\n\n**💎 ZENITH APEX EXCLUSIVE**`,
                fields: [
                    { name: '🛰️ Anti-Spam', value: 'Global threat intelligence & Mitigation', inline: true },
                    { name: '📈 Analytics', value: 'Macroscopic threat curves & Incident logs', inline: true },
                    { name: '📜 Audit Ledger', value: 'High-fidelity event forensic tracing', inline: true },
                    { name: '🔥 Threat Level', value: '`MINIMAL`', inline: true },
                    { name: '🛡️ Shield Status', value: '`OPTIMIZED`', inline: true },
                    { name: '⚖️ Dispatch', value: '`READY`', inline: true }
                ],
                footer: 'Zenith Apex Security Orchestration • V4 Guardian Suite',
                color: 'premium'
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('v4_antispam').setLabel('Anti-Spam').setStyle(ButtonStyle.Primary).setEmoji('🛡️'),
                new ButtonBuilder().setCustomId('v4_analytics').setLabel('Security Analytics').setStyle(ButtonStyle.Secondary).setEmoji('📈'),
                new ButtonBuilder().setCustomId('v4_audit').setLabel('Audit Ledger').setStyle(ButtonStyle.Secondary).setEmoji('📜')
            );

            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Security Hub Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Nexus failure: Unable to synchronize Guardian Command Nexus.')] });
        }
    }
};
