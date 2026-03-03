const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed, createPremiumEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('executive_hub')
        .setDescription('Enterprise Hyper-Apex: Executive Macroscopic Intelligence Nexus'),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Enterprise License Guard
            const license = await validatePremiumLicense(interaction, 'premium');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: license.components });
            }

            const embed = await createCustomEmbed(interaction, {
                title: '🏢 Enterprise Executive Hyper-Apex: Intelligence Hub',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🔮 High-Fidelity Strategic Terminal\nMacroscopic intelligence interface for the **${interaction.guild.name}** sector. Access AI briefings, ROI yield modeling, and global market tickers.\n\n**💎 Enterprise HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '🧠 Briefing AI', value: 'Performance Trajectory Signaling', inline: true },
                    { name: '⚖️ ROI Matrix', value: 'Personnel Yield & Burn Modeling', inline: true },
                    { name: '🛰️ Global Ticker', value: '`SIGNAL-NEXUS ONLINE`', inline: true },
                    { name: '⚡ Intelligence Band', value: '`WIDE-SPECTRUM [9.2 GHz]`', inline: true },
                    { name: '🌐 Global Grid', value: '`ENCRYPTED & SYNCED`', inline: true },
                    { name: '✨ Visual Tier', value: '`DIVINE [APEX]`', inline: true }
                ],
                footer: 'Enterprise Hyper-Apex Executive Intelligence • V5 Strategic Suite',
                color: 'premium'
            });

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('v5_briefing').setLabel('Executive Briefing').setStyle(ButtonStyle.Danger).setEmoji('📊'),
                new ButtonBuilder().setCustomId('v5_roi').setLabel('ROI Calculator').setStyle(ButtonStyle.Success).setEmoji('⚖️'),
                new ButtonBuilder().setCustomId('v5_analytics').setLabel('Macro Analytics').setStyle(ButtonStyle.Secondary).setEmoji('📈')
            );

            await interaction.editReply({ embeds: [embed], components: [row1] });

        } catch (error) {
            console.error('Executive Hub Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Nexus failure: Unable to synchronize Executive Command Nexus.')] });
        }
    }
};

