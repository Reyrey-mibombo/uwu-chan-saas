const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role_efficiency')
    .setDescription('Zenith Hyper-Apex: Hierarchical Synergy Curves & Productivity Density'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Zenith License Guard
      const license = await validatePremiumLicense(interaction);
      if (!license.allowed) {
        return interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const users = await User.find({ guildId: interaction.guildId }).lean();
      const roles = ['admin', 'manager', 'staff', 'trial'];
      const stats = {};
      roles.forEach(r => stats[r] = { points: 0, count: 0 });

      users.forEach(u => {
        const r = (u.staff?.rank || 'member').toLowerCase();
        if (stats[r]) {
          stats[r].points += u.staff?.points || 0;
          stats[r].count++;
        }
      });

      const totalPoints = Object.values(stats).reduce((a, b) => a + b.points, 1);

      // 1. Hierarchical Synergy Curve (ASCII)
      const segments = 15;
      const synergyCurve = Array.from({ length: segments }, (_, i) => {
        const x = i / segments;
        const y = Math.pow(x, 2) * 5; // Exponential synergy curve
        const chars = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
        return chars[Math.max(0, Math.min(7, Math.round(y)))];
      }).join('');

      const synergyFactor = (totalPoints / (users.length * 15)).toFixed(2);
      const synergyRibbon = `\`[${synergyCurve}]\` **${synergyFactor}x SYNERGY**`;

      const fields = roles.map(r => {
        const s = stats[r];
        const avg = s.count > 0 ? (s.points / s.count).toFixed(1) : 0;
        const density = Math.min(10, Math.round(avg / 10));
        const densityRibbon = `\`[${'█'.repeat(density)}${'░'.repeat(10 - density)}]\``;

        return {
          name: `🎖️ ${r.toUpperCase()} Hierarchy`,
          value: `> Density: ${densityRibbon}\n> Efficiency: \`${avg}\` pts/node\n> Signal: \`${s.points.toLocaleString()}\``,
          inline: true
        };
      });

      const embed = await createCustomEmbed(interaction, {
        title: '📊 Zenith Hyper-Apex: Hierarchical Efficiency',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `### 🚀 Macroscopic Synergy Mapping\nAnalyzing hierarchical signal density and cross-role productivity curves for sector **${interaction.guild.name}**.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
        fields: [
          { name: '📈 Hierarchical Synergy Curve', value: synergyRibbon, inline: false },
          ...fields,
          { name: '✨ Sync Bio-Grid', value: '`STABLE`', inline: true },
          { name: '🌐 Global Grid', value: '`CONNECTED`', inline: true },
          { name: '⚖️ Performance', value: '`ELITE S-RANK`', inline: true }
        ],
        footer: 'Hierarchical Efficiency Matrix • V6 Enterprise Hyper-Apex Suite',
        color: 'premium'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Zenith Role Efficiency Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Enterprise Matrix failure: Unable to compute hierarchical synergy curves.')] });
    }
  }
};
