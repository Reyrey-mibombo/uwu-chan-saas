const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User, Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_stats')
    .setDescription('Zenith Hyper-Apex: Macroscopic Operational Analytics & Merit Velocity')
    .addUserOption(opt => opt.setName('user').setDescription('Personnel to audit (Optional)').setRequired(false)),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();
      const user = interaction.options.getUser('user') || interaction.user;
      const staffSystem = client.systems.staff;

      if (!staffSystem) {
        return interaction.editReply({ embeds: [createErrorEmbed('Operational systems are currently offline.')] });
      }

      const points = await staffSystem.getPoints(user.id, interaction.guildId);
      const warnings = await staffSystem.getUserWarnings(user.id, interaction.guildId);
      const rank = await staffSystem.getRank(user.id, interaction.guildId);
      const score = await staffSystem.calculateStaffScore(user.id, interaction.guildId);

      const shifts = await Shift.find({ userId: user.id, guildId: interaction.guild.id }).lean();
      const totalShiftTime = shifts.reduce((acc, s) => acc + (s.duration || 0), 0);
      const hours = Math.floor(totalShiftTime / 3600);
      const minutes = Math.floor((totalShiftTime % 3600) / 60);

      // 1. Merit Velocity Gauge (ASCII)
      const segments = 12;
      const velocity = Math.min(100, Math.round(score || 0));
      const filled = '█'.repeat(Math.round((velocity / 100) * segments));
      const empty = '░'.repeat(segments - filled.length);
      const velocityRibbon = `\`[⚡ ${filled}${empty}]\` **${velocity}% INTENSITY**`;

      // 2. Efficiency Ribbon
      const efficiency = shifts.length > 0 ? (points / shifts.length).toFixed(1) : 0;
      const efficiencyRibbon = `\`[${'▓'.repeat(Math.min(10, Math.round(efficiency)))}${'░'.repeat(Math.max(0, 10 - Math.round(efficiency)))}]\``;

      const embed = await createCustomEmbed(interaction, {
        title: `📊 Zenith Hyper-Apex: Operational Analytics`,
        thumbnail: user.displayAvatarURL({ dynamic: true }),
        description: `### 🛡️ Macroscopic Personnel Audit\nAnalyzing operational velocity, merit density, and session integrity for **${user.username}**.\n\n**💎 ZENITH HYPER-APEX EXCLUSIVE**`,
        fields: [
          { name: '⚡ Merit Velocity Gauge', value: velocityRibbon, inline: false },
          { name: '📈 Efficiency Ribbon', value: `${efficiencyRibbon} \`${efficiency}\` sig/session`, inline: false },
          { name: '⭐ Points', value: `\`${points.toLocaleString()}\``, inline: true },
          { name: '🏆 Rank', value: `\`${rank.toUpperCase()}\``, inline: true },
          { name: '🏛️ Score', value: `\`${score || 0}/100\``, inline: true },
          { name: '⏱️ Active Time', value: `\`${hours}h ${minutes}m\``, inline: true },
          { name: '⚠️ Incidents', value: `\`${warnings?.total || 0}\``, inline: true },
          { name: '📅 Sessions', value: `\`${shifts.length}\``, inline: true }
        ],
        footer: 'Operational Analytics Engine • V1 Foundation Hyper-Apex Suite',
        color: 'premium'
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Zenith Staff Stats Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Operational Analytics failure: Unable to decode personnel telemetry.')] });
    }
  }
};
