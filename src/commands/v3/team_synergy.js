const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { User } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('team_synergy')
        .setDescription('Zenith Hyper-Apex: Macroscopic Collaborative Efficiency & Synergy Ribbons'),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Zenith Hyper-Apex License Guard
            const license = await validatePremiumLicense(interaction);
            if (!license.allowed) {
                return interaction.editReply({ embeds: [license.embed], components: license.components });
            }

            const users = await User.find({ guildId: interaction.guildId }).lean();

            const roles = ['admin', 'manager', 'staff', 'trial'];
            const stats = {};
            roles.forEach(r => stats[r] = { points: 0, count: 0 });

            users.forEach(u => {
                const r = u.staff?.rank || 'member';
                if (stats[r]) {
                    stats[r].points += u.staff?.points || 0;
                    stats[r].count++;
                }
            });

            // Calculate Synergy (Relationship between different role outputs)
            const totalPoints = Object.values(stats).reduce((a, b) => a + b.points, 0);
            const synergyIndex = totalPoints > 0 ? (totalPoints / (users.length * 10)) : 0;
            const synergyPct = Math.min(100, (synergyIndex * 15).toFixed(1));

            // 1. Generate Synergy Ribbon
            const barLength = 15;
            const filled = '█'.repeat(Math.round((synergyPct / 100) * barLength));
            const empty = '░'.repeat(barLength - filled.length);
            const synergyRibbon = `\`[${filled}${empty}]\` **${synergyPct}% SYNERGY**`;

            const fields = roles.map(r => {
                const s = stats[r];
                const contribution = totalPoints > 0 ? ((s.points / totalPoints) * 100).toFixed(1) : 0;
                return {
                    name: `🎖️ ${r.toUpperCase()} Vector`,
                    value: `> Yield: \`${s.points.toLocaleString()}\` merit\n> Impact: \`${contribution}%\` | Personnel: \`${s.count}\``,
                    inline: true
                };
            });

            const embed = await createCustomEmbed(interaction, {
                title: '🤝 Zenith Hyper-Apex: Synergy Analytics',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🚀 Macroscopic Collaborative Orchestration\nAnalyzing collaborative resonance and cross-role signal yield for sector **${interaction.guild.name}**.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '✨ Unified Synergy Ribbon', value: synergyRibbon, inline: false },
                    ...fields,
                    { name: '⚖️ Intelligence Tier', value: '`PLATINUM [HYPER-APEX]`', inline: true },
                    { name: '🛡️ Auth Node', value: '`ZENITH-SYNC-01`', inline: true }
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
