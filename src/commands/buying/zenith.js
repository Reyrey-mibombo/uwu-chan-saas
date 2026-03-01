const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('zenith')
        .setDescription('Zenith Platinum: Unified Macroscopic Command Terminal (Master Hub)'),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Zenith Master License Guard
            const license = await validatePremiumLicense(interaction);
            if (!license.allowed) {
                return interaction.editReply({ embeds: [license.embed], components: license.components });
            }

            const embed = await createCustomEmbed(interaction, {
                title: '💎 Zenith Hyper-Apex: Omni-Nexus Master Portal',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🚀 Global System Orchestration\nUnified macroscopic command terminal for sector **${interaction.guild.name}**. Monitoring predictive metabolic clusters and collaborative synergy sync across all 8 Zenith Tiers.\n\n**Verified Hyper-Apex Master Terminal**`,
                fields: [
                    { name: '🏢 Workforce (V3)', value: 'Synergy ribbons & Skill trees', inline: true },
                    { name: '🛡️ Guardian (V4)', value: 'Threat forecast & Shield audit', inline: true },
                    { name: '📊 Intelligence (V5)', value: 'Daily brief & ROI matrix', inline: true },
                    { name: '📈 Enterprise (V6)', value: 'Metabolic cluster modeling', inline: true },
                    { name: '🤖 Automation (V7)', value: 'Automation pulse & logic', inline: true },
                    { name: '🎨 Identity (V8)', value: 'Divine visuals & Passports', inline: true },
                    { name: '🌐 Global Nexus ROI', value: '`🟢 +186% SIGNAL DENSITY`', inline: true },
                    { name: '🛡️ Hyper-Shield', value: '`MAXIMUM DETERRENCE`', inline: true }
                ],
                footer: 'Zenith Omni-Nexus Master Terminal • Hyper-Apex Standard',
                color: 'premium'
            });

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('nexus_workforce').setLabel('Workforce Nexus').setStyle(ButtonStyle.Primary).setEmoji('🏢'),
                new ButtonBuilder().setCustomId('nexus_guardian').setLabel('Guardian Nexus').setStyle(ButtonStyle.Primary).setEmoji('🛡️'),
                new ButtonBuilder().setCustomId('nexus_intelligence').setLabel('Executive Nexus').setStyle(ButtonStyle.Primary).setEmoji('📊')
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('nexus_enterprise').setLabel('Predictive Matrix').setStyle(ButtonStyle.Secondary).setEmoji('📈'),
                new ButtonBuilder().setCustomId('nexus_automation').setLabel('Smart Auto').setStyle(ButtonStyle.Secondary).setEmoji('🤖'),
                new ButtonBuilder().setCustomId('nexus_visuals').setLabel('Visual Sync').setStyle(ButtonStyle.Secondary).setEmoji('🎨')
            );

            await interaction.editReply({ embeds: [embed], components: [row1, row2] });

        } catch (error) {
            console.error('Zenith Hub Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Nexus failure: Unable to establish macroscopic system link.')] });
        }
    }
};
