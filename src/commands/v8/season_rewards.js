const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('season_rewards')
    .setDescription('View seasonal rewards for top staff this season'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const now = new Date();
    const month = now.getMonth();
    const season = month < 3 ? '❄️ Winter' : month < 6 ? '🌸 Spring' : month < 9 ? '☀️ Summer' : '🍂 Autumn';
    const year = now.getFullYear();
    const top = await User.find({ 'staff.points': { $gt: 0 } }).sort({ 'staff.points': -1 }).limit(3).lean();
    const medals = ['🥇', '🥈', '🥉'];
    const list = top.map((u, i) => `${medals[i]} **${u.username || '?'}** — ${u.staff?.points || 0} pts`).join('\n') || 'No data yet.';
    const embed = new EmbedBuilder()
      .setTitle(`${season} Season Rewards — ${year}`)
      .setColor(0x1abc9c)
      .addFields(
        { name: '🗓️ Current Season', value: season, inline: true },
        { name: '📅 Year', value: year.toString(), inline: true },
        { name: '🏆 Season Top 3', value: list },
        { name: '🎁 Season Rewards', value: '🥇 1st Place: **Legend Badge + 200 bonus pts**\n🥈 2nd Place: **Diamond Badge + 100 bonus pts**\n🥉 3rd Place: **Gold Badge + 50 bonus pts**' }
      )
      .setFooter({ text: `${interaction.guild.name} • Season Rewards` })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  }
};
