const { SlashCommandBuilder } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weekly_bonus')
    .setDescription('View top 5 staff by points earned this week'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const { Activity } = require('../../database/mongo');
    const guildId = interaction.guildId;
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    const weekActivity = await Activity.find({ guildId, type: 'promotion', createdAt: { $gte: sevenDaysAgo } }).lean();
    const users = await User.find({ 'staff.points': { $gt: 0 } }).sort({ 'staff.points': -1 }).limit(5).lean();

    const weekMap = {};
    weekActivity.forEach(a => { weekMap[a.userId] = (weekMap[a.userId] || 0) + (a.data?.bonusPoints || 10); });

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    const list = users.map((u, i) =>
      `${medals[i]} **${u.username || 'Unknown'}** — ${u.staff?.points || 0} pts total | +${weekMap[u.userId] || 0} this week`
    ).join('\n') || 'No data yet.';

    const embed = createEnterpriseEmbed()
      .setTitle('📅 Weekly Bonus Leaders')
      
      .setDescription(list)
      .addFields(
        { name: '🎁 Bonus Events (7d)', value: weekActivity.length.toString(), inline: true },
        { name: '👥 Total Bonus Recipients', value: Object.keys(weekMap).length.toString(), inline: true }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};



