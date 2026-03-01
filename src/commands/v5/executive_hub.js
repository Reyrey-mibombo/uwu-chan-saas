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
                title: '📊 Zenith Executive Apex: Intelligence Nexus',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🔮 Macroscopic Intelligence Orchestration\nUnified administrative portal for sector **${interaction.guild.name}**. Access AI-simulated projections and macroscopic behavioral modeling.\n\n**💎 ZENITH APEX EXCLUSIVE**`,
                fields: [
                    { name: '📊 Dashboard', value: 'Unified macroscopic data orchestration', inline: true },
                    { name: '🔮 Growth Projections', value: 'AI-simulated trajectory modeling', inline: true },
                    { name: '🧠 Personnel Behavior', value: 'AI reliability scoring & Stability analytics', inline: true },
                    { name: '👥 Node Density', value: `\`${interaction.guild.memberCount}\` Nodes`, inline: true },
                    { name: '✨ Visual Tier', value: '`PLATINUM [APEX]`', inline: true },
                    { name: '⚖️ Intelligence', value: '`ENHANCED`', inline: true }
                ],
                footer: 'Zenith Apex Executive Intelligence • V5 Executive Suite',
                color: 'premium'
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('v5_dashboard').setLabel('Executive Dashboard').setStyle(ButtonStyle.Primary).setEmoji('📊'),
                new ButtonBuilder().setCustomId('v5_growth').setLabel('Growth Projections').setStyle(ButtonStyle.Secondary).setEmoji('🔮'),
                new ButtonBuilder().setCustomId('v5_behavior').setLabel('Behavioral Matrix').setStyle(ButtonStyle.Secondary).setEmoji('🧠')
            );

            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Executive Hub Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Nexus failure: Unable to synchronize Executive Intelligence Portal.')] });
        }
    }
};
