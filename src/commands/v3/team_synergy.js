const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { User, Activity } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('team_synergy')
        .setDescription('Zenith Hyper-Apex: Macroscopic Collaborative Resonance & Heatmap Ribbons'),

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
            const roles = ['admin', 'manager', 'staff', 'trial'];
            const stats = {};
            roles.forEach(r => stats[r] = { points: 0, count: 0, activity: 0 });

            // Fetch activity counts for signal density
            const activities = await Activity.find({ guildId, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }).lean();

            users.forEach(u => {
                const r = (u.staff?.rank || 'member').toLowerCase();
                if (stats[r]) {
                    stats[r].points += u.staff?.points || 0;
                    stats[r].count++;
                    const userActivity = activities.filter(a => a.userId === u.userId).length;
                    stats[r].activity += userActivity;
                }
            });

            const totalPoints = Object.values(stats).reduce((a, b) => a + b.points, 0);
            const totalActivity = activities.length;

            // Synergy Index: Real output vs personnel volume
            const synergyIndex = totalPoints > 0 ? (totalPoints / (users.length * 10)) : 0;
            const synergyPct = Math.min(100, (synergyIndex * 15).toFixed(1));

            // 1. Generate Resonance Heatmap Ribbon
            const barLength = 15;
            const heatChars = ['░', '▒', '▓', '█'];
            const heatmap = Array.from({ length: barLength }, (_, i) => {
                const segmentVal = (synergyPct / 100) * barLength;
                if (i < segmentVal - 1) return heatChars[3];
                if (i < segmentVal) return heatChars[2];
                if (i < segmentVal + 1) return heatChars[1];
                return heatChars[0];
            }).join('');

            const synergyRibbon = `\`[${heatmap}]\` **${synergyPct}% RESONANCE**`;

            const fields = roles.map(r => {
                const s = stats[r];
                const contribution = totalPoints > 0 ? ((s.points / totalPoints) * 100).toFixed(1) : 0;
                const density = s.count > 0 ? (s.activity / s.count).toFixed(1) : 0;
                return {
                    name: `🎖️ ${r.toUpperCase()} Vector`,
                    value: `> Yield: \`${s.points.toLocaleString()}\` merit\n> Impact: \`${contribution}%\` | Density: \`${density}\` sig/node`,
                    inline: true
                };
            });

            const embed = await createCustomEmbed(interaction, {
                title: '🤝 Zenith Hyper-Apex: Collaborative Synergy Matrix',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🚀 Macroscopic Resonator Analytics\nAnalyzing collaborative frequency and cross-role signal density for sector **${interaction.guild.name}**.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '✨ Resonance Heatmap Ribbon', value: synergyRibbon, inline: false },
                    ...fields,
                    { name: '⚡ Signal Frequency', value: `\`${(totalActivity / 24).toFixed(1)}\` sig/hr`, inline: true },
                    { name: '🌐 Global Sync', value: '`CONNECTED`', inline: true },
                    { name: '⚖️ Intelligence Tier', value: '`PLATINUM [HYPER-APEX]`', inline: true }
                ],
                footer: 'Synergy Matrix Orchestration • V3 Workforce Hyper-Apex Suite',
                color: 'premium'
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Zenith Team Synergy Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Synergy Matrix failure: Unable to compute collaborative resonance.')] });
        }
    }
};
