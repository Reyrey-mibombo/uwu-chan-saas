const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('executive_hub')
        .setDescription('Zenith Apex: Unified Executive Intelligence & Macroscopic Nexus'),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Zenith License Guard
            const license = await validatePremiumLicense(interaction);
            if (!license.allowed) {
                return interaction.editReply({ embeds: [license.embed], components: license.components });
            }

            const embed = await createCustomEmbed(interaction, {
                title: '📊 Zenith Executive Hyper-Apex: Intelligence Nexus',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🔮 Macroscopic Intelligence Orchestration\nUnified administrative portal for sector **${interaction.guild.name}**. Access AI-driven briefings, growth projections, and macroscopic ROI analytics.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '📋 Executive Briefing', value: '24h macroscopic state audit', inline: true },
                    { name: '📈 ROI Analytics', value: 'Personnel impact vs Overhead', inline: true },
                    { name: '🔮 Growth Projections', value: 'AI-simulated trajectory modeling', inline: true },
                    { name: '🌐 Global Benchmark', value: '`🟢 ELITE PERFORMANCE NODE`', inline: true },
                    { name: '✨ Visual Tier', value: '`PLATINUM [HYPER-APEX]`', inline: true },
                    { name: '⚖️ Intelligence', value: '`SYNCHRONIZED`', inline: true }
                ],
                footer: 'Zenith Hyper-Apex Executive Intelligence • V5 Executive Suite',
                color: 'premium'
            });

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('v5_briefing').setLabel('Executive Briefing').setStyle(ButtonStyle.Primary).setEmoji('📋'),
                new ButtonBuilder().setCustomId('v5_roi').setLabel('ROI Analytics').setStyle(ButtonStyle.Primary).setEmoji('📈'),
                new ButtonBuilder().setCustomId('v5_growth').setLabel('Growth Projections').setStyle(ButtonStyle.Secondary).setEmoji('🔮')
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('v5_behavior').setLabel('Behavioral Matrix').setStyle(ButtonStyle.Secondary).setEmoji('🧠'),
                new ButtonBuilder().setCustomId('v5_dashboard').setLabel('Executive Dashboard').setStyle(ButtonStyle.Secondary).setEmoji('📊')
            );

            await interaction.editReply({ embeds: [embed], components: [row1, row2] });

        } catch (error) {
            console.error('Executive Hub Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Nexus failure: Unable to synchronize Executive Intelligence Portal.')] });
        }
    }
};
