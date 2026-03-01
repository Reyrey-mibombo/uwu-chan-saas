const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('executive_hub')
        .setDescription('Zenith Hyper-Apex: Executive Macroscopic Intelligence Nexus'),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Zenith License Guard
            const license = await validatePremiumLicense(interaction);
            if (!license.allowed) {
                return interaction.editReply({ embeds: [license.embed], components: license.components });
            }

            const embed = await createCustomEmbed(interaction, {
                title: '🏢 Zenith Executive Hyper-Apex: Intelligence Hub',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🔮 High-Fidelity Strategic Terminal\nMacroscopic intelligence interface for the **${interaction.guild.name}** sector. Access AI briefings, ROI yield modeling, and global market tickers.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '🧠 Briefing AI', value: 'Performance Trajectory Signaling', inline: true },
                    { name: '⚖️ ROI Matrix', value: 'Personnel Yield & Burn Modeling', inline: true },
                    { name: '🛰️ Global Ticker', value: '`SIGNAL-NEXUS ONLINE`', inline: true },
                    { name: '⚡ Intelligence Band', value: '`WIDE-SPECTRUM [9.2 GHz]`', inline: true },
                    { name: '🌐 Global Grid', value: '`ENCRYPTED & SYNCED`', inline: true },
                    { name: '✨ Visual Tier', value: '`DIVINE [APEX]`', inline: true }
                ],
                footer: 'Zenith Hyper-Apex Executive Intelligence • V5 Strategic Suite',
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
