const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bonus_visual')
    .setDescription('Visual breakdown of bonus points across all staff'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const users = await User.find({ 'staff.points': { $gt: 0 } }).sort({ 'staff.points': -1 }).limit(8).lean();
    if (!users.length) return interaction.editReply('📊 No staff data found yet.');

    const maxPts = users[0]?.staff?.points || 1;
    const chart = users.map((u, i) => {
      const pts = u.staff?.points || 0;
      const bar = '█'.repeat(Math.round((pts / maxPts) * 10)).padEnd(10, '░');
      return `\`${String(i + 1).padStart(2)}\` ${bar} **${pts}** — ${u.username || '?'}`;
    }).join('\n');

    const totalPts = users.reduce((s, u) => s + (u.staff?.points || 0), 0);

    const embed = new EmbedBuilder()
      .setTitle('💰 Bonus Points Visual')
      .setColor(0xf1c40f)
      .setDescription(`\`\`\`${chart}\`\`\``)
      .addFields(
        { name: '⭐ Total Points (Top 8)', value: totalPts.toString(), inline: true },
        { name: '🏆 Highest', value: (users[0]?.staff?.points || 0).toString(), inline: true },
        { name: '📊 Average', value: (totalPts / users.length).toFixed(0), inline: true }
      )
      .setFooter({ text: `${interaction.guild.name} • Bonus Points Visual` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
