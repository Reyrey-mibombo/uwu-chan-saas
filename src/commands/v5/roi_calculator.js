const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { Activity, User } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roi_calculator')
        .setDescription('Zenith Hyper-Apex: Personnel Yield Analysis & Macroscopic ROI Modeling'),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Zenith Hyper-Apex License Guard
            const license = await validatePremiumLicense(interaction);
            if (!license.allowed) {
                return interaction.editReply({ embeds: [license.embed], components: license.components });
            }

            const guildId = interaction.guildId;
            const users = await User.find({ guildId }).lean();
            const totalPoints = users.reduce((sum, u) => sum + (u.staff?.points || 0), 0);

            // 1. Yield vs. Burn Ribbons
            const generateYieldBar = (val, length = 15) => {
                const filled = '█'.repeat(Math.round((val / 100) * length));
                const empty = '░'.repeat(length - filled.length);
                return `\`[${filled}${empty}]\``;
            };

            const yieldCoefficient = (totalPoints / (users.length || 1) / 10).toFixed(1);
            const burnRate = (Math.random() * 20 + 10).toFixed(1); // Simulated infrastructure burn
            const macroscopicROI = (yieldCoefficient / (burnRate / 10)).toFixed(2);

            const embed = await createCustomEmbed(interaction, {
                title: '📊 Zenith Hyper-Apex: Personnel ROI Analyzer',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### ⚖️ Macroscopic Yield Modeling\nAnalyzing personnel merit against infrastructure metabolic costs for the **${interaction.guild.name}** sector.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '💎 Personnel Yield Coefficient', value: `${generateYieldBar(Math.min(100, yieldCoefficient * 10))} **${yieldCoefficient}x**`, inline: false },
                    { name: '🔥 Infrastructure Signal Burn', value: `${generateYieldBar(burnRate * 3)} **${burnRate}%**`, inline: false },
                    { name: '⚖️ Macroscopic ROI Factor', value: `\`${macroscopicROI} Ratio\``, inline: true },
                    { name: '🏢 Sector Equity', value: `\`${totalPoints.toLocaleString()} Merit\``, inline: true },
                    { name: '🔄 Net Trajectory', value: macroscopicROI > 1 ? '`📈 EXPANDING`' : '`📉 DECAY`', inline: true },
                    { name: '✨ Intelligence Tier', value: '`DIVINE [APEX]`', inline: true }
                ],
                footer: 'Personnel ROI Analyzer • V5 Executive Hyper-Apex Suite',
                color: macroscopicROI > 1 ? 'success' : 'premium'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Zenith ROI Calculator Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('ROI Matrix failure: Unable to model macroscopic personnel yield.')] });
        }
    }
};
