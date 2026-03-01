const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role_efficiency')
    .setDescription('Zenith Apex: Executive Role Performance & Signal Yield Matrix'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Zenith License Guard
      const license = await validatePremiumLicense(interaction);
      if (!license.allowed) {
        return interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const users = await User.find({ guildId: interaction.guildId }).lean();
      if (!users.length) {
        return interaction.editReply({ embeds: [createErrorEmbed('Insufficient metabolic data recorded to generate a role mapping.')] });
      }

      const rankGroups = {};
      users.forEach(u => {
        const rank = u.staff?.rank || 'member';
        if (!rankGroups[rank]) rankGroups[rank] = { totalPoints: 0, totalConsistency: 0, count: 0 };
        rankGroups[rank].totalPoints += u.staff?.points || 0;
        rankGroups[rank].totalConsistency += u.staff?.consistency || 100;
        rankGroups[rank].count++;
      });

      const rankOrder = ['admin', 'manager', 'senior', 'staff', 'trial', 'member'];
      const sortedRanks = Object.entries(rankGroups).sort((a, b) => {
        const ia = rankOrder.indexOf(a[0]);
        const ib = rankOrder.indexOf(b[0]);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      }).slice(0, 5); // Performance top 5

      const allAvgPoints = sortedRanks.map(([, g]) => g.totalPoints / g.count);
      const maxAverage = Math.max(...allAvgPoints, 1);

      const synergyCoef = (1.0 + (sortedRanks.length * 0.05)).toFixed(2);

      const fields = sortedRanks.map(([rank, g]) => {
        const avgPts = (g.totalPoints / g.count).toFixed(1);
        const avgCon = (g.totalConsistency / g.count).toFixed(1);

        // Zenith Hyper-Apex Trajectory Ribbon
        const length = 15;
        const filled = '█'.repeat(Math.round((parseFloat(avgPts) / maxAverage) * length));
        const empty = '░'.repeat(length - filled.length);
        const trajectory = `\`[${filled}${empty}]\` **${avgPts}**`;

        return {
          name: `🎖️ Sector Rank: ${rank.toUpperCase()}`,
          value: `> Signal Yield: ${trajectory}\n> Stability: \`${avgCon}%\` | Personnel: \`${g.count}\``,
          inline: false
        };
      });

      const embed = await createCustomEmbed(interaction, {
        title: '📊 Zenith Hyper-Apex: Role Yield Matrix',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `### 🛡️ Macroscopic Rank Orchestration\nPersonnel productivity correlation for the **${interaction.guild.name}** sector. Current Macroscopic Synergy Coefficient: \`${synergyCoef}x Resonance\`.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
        fields: fields,
        footer: 'Executive Productivity Matrix • V6 Enterprise Hyper-Apex Suite',
        color: 'premium'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Role Efficiency Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Enterprise Matrix failure: Unable to decode hierarchy signal yields.')] });
    }
  }
};
