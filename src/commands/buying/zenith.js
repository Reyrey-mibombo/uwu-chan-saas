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
                title: '💎 Zenith Platinum: Macroscopic Command Terminal',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🚀 Nexus Systems Online\nUnified administrative interface for sector **${interaction.guild.name}**. Monitoring macroscopic signals across all premium modules. Select a sub-sector nexus to establish a link.\n\n**Verified Strategic Master Terminal**`,
                fields: [
                    { name: '🏢 Workforce (V3)', value: 'Strategic optimization & Dossiers', inline: true },
                    { name: '🛡️ Guardian (V4)', value: 'Global security & C&C control', inline: true },
                    { name: '📊 Intelligence (V5)', value: 'Executive AI projections & Audit', inline: true },
                    { name: '📈 Enterprise (V6)', value: 'Predictive forecasting & Role yield', inline: true },
                    { name: '🤖 Automation (V7)', value: 'Smart logic & Auto-merit systems', inline: true },
                    { name: '🎨 Identity (V8)', value: 'Visual branding & Elite effects', inline: true },
                    { name: '🌐 Global ROI', value: '`+142% Signal Density`', inline: true },
                    { name: '🛡️ Security', value: '`ZENITH-SHIELD ACTIVE`', inline: true }
                ],
                footer: 'Zenith Nexus Master Terminal • 1.2M Global Signals Tracked',
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
