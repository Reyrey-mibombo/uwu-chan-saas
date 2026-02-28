const { SlashCommandBuilder } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('team_highlights')
    .setDescription('View the week\'s team highlights and top contributors'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const { Activity } = require('../../database/mongo');
    const guildId = interaction.guildId;
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const [weekActs, topStaff] = await Promise.all([
      Activity.find({ guildId, createdAt: { $gte: sevenDaysAgo } }).lean(),
      User.find({ 'staff.points': { $gt: 0 } }).sort({ 'staff.points': -1 }).limit(3).lean()
    ]);

    const medals = ['🥇', '🥈', '🥉'];
    const topList = topStaff.map((u, i) => `${medals[i]} **${u.username || '?'}** — ${u.staff?.points || 0} pts`).join('\n') || 'No data.';
    const activeCount = [...new Set(weekActs.map(a => a.userId))].length;
    const promotions = weekActs.filter(a => a.type === 'promotion').length;

    const embed = createEnterpriseEmbed()
      .setTitle(`✨ Team Highlights — Week of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)
      
      .addFields(
        { name: '👥 Active Staff (7d)', value: activeCount.toString(), inline: true },
        { name: '⬆️ Promotions (7d)', value: promotions.toString(), inline: true },
        { name: '⚡ Total Events (7d)', value: weekActs.length.toString(), inline: true },
        { name: '🏆 Top Performers This Week', value: topList }
      )
      
      ;
    await interaction.editReply({ embeds: [embed] });
  }
};



