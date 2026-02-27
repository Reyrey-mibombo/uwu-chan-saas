const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_chart')
    .setDescription('Visual progress chart for all staff toward their next rank'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const THRESHOLDS = { trial: 0, staff: 100, senior: 300, manager: 600, admin: 1000, owner: 2000 };
    const RANK_ORDER = ['trial', 'staff', 'senior', 'manager', 'admin', 'owner'];
    const users = await User.find({ 'staff.points': { $gt: 0 } }).sort({ 'staff.points': -1 }).limit(8).lean();
    if (!users.length) return interaction.editReply('📊 No staff data yet.');
    const lines = users.map(u => {
      const rank = u.staff?.rank || 'trial';
      const pts = u.staff?.points || 0;
      const nextRank = RANK_ORDER[RANK_ORDER.indexOf(rank) + 1];
      if (!nextRank) return `👑 **${u.username || '?'}** — MAX`;
      const pct = Math.min(100, Math.round((pts / THRESHOLDS[nextRank]) * 100));
      const bar = '▓'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
      return `**${u.username || '?'}**: \`${bar}\` ${pct}% → ${nextRank}`;
    }).join('\n');
    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('📊 Staff Progress Chart')
      
      .setDescription(lines)
      
      ;
    await interaction.editReply({ embeds: [embed] });
  }
};
