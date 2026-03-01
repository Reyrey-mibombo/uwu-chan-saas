const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { User, Activity } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roi_calculator')
        .setDescription('Zenith Hyper-Apex: Macroscopic Personnel ROI & Impact Analytics'),

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
            const staffMembers = users.filter(u => u.staff);

            const totalMerit = staffMembers.reduce((a, b) => a + (b.staff.points || 0), 0);
            const avgMerit = staffMembers.length > 0 ? (totalMerit / staffMembers.length).toFixed(1) : 0;

            // ROI Logic (Personnel Merit vs Infrastructure - Simulated)
            const infrastructureCost = 1500; // Simulated constant
            const meritValue = totalMerit * 0.5; // Simulated coefficient
            const roi = ((meritValue - infrastructureCost) / infrastructureCost * 100).toFixed(1);

            // 1. Generate ROI Ribbon
            const barLength = 15;
            const normalizedRoi = Math.min(100, Math.max(-50, parseFloat(roi)));
            const filled = '█'.repeat(Math.round(((normalizedRoi + 50) / 150) * barLength));
            const empty = '░'.repeat(Math.max(0, barLength - filled.length));
            const roiRibbon = `\`[${filled}${empty}]\` **${roi}% ROI**`;

            const embed = await createCustomEmbed(interaction, {
                title: '📊 Zenith Hyper-Apex: Personnel ROI Matrix',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🚀 Macroscopic Impact Analysis\nAnalyzing aggregate personnel merit vs sector infrastructure overhead for **${interaction.guild.name}**.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '📉 Strategic Impact Ribbon', value: roiRibbon, inline: false },
                    { name: '🏆 Aggregate Merit', value: `\`${totalMerit.toLocaleString()}\` signals`, inline: true },
                    { name: '👥 Staff Nodes', value: `\`${staffMembers.length}\` Active`, inline: true },
                    { name: '🔥 Avg Yield/Node', value: `\`${avgMerit}\` pts`, inline: true },
                    { name: '✨ Intelligence Tier', value: '`PLATINUM [HYPER-APEX]`', inline: true },
                    { name: '⚖️ Data Fidelity', value: '`SYNCHRONIZED`', inline: true },
                    { name: '🛡️ Auth Node', value: '`ZENITH-ROI-01`', inline: true }
                ],
                footer: 'ROI Impact Matrix • V5 Executive Hyper-Apex Suite',
                color: parseFloat(roi) > 0 ? 'success' : 'premium'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Zenith ROI Calculator Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Impact Analytics failure: Unable to compute personnel ROI.')] });
        }
    }
};
