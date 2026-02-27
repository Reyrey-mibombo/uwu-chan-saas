const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prediction_summary')
    .setDescription('Summary of prediction insights based on recent trends'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000);
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000);
    const [thisWeek, lastWeek] = await Promise.all([
      Activity.find({ guildId, createdAt: { $gte: oneWeekAgo } }).lean(),
      Activity.find({ guildId, createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo } }).lean()
    ]);

    const predict = (cur, prev) => {
      if (prev === 0) return { val: cur, change: 0 };
      const rate = cur / prev;
      return { val: Math.round(cur * rate), change: Math.round((rate - 1) * 100) };
    };

    const totalPred = predict(thisWeek.length, lastWeek.length);
    const cmdPred = predict(
      thisWeek.filter(a => a.type === 'command').length,
      lastWeek.filter(a => a.type === 'command').length
    );

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('🔮 Prediction Summary')
      
      .addFields(
        { name: '📊 This Week Total', value: thisWeek.length.toString(), inline: true },
        { name: '📅 Last Week Total', value: lastWeek.length.toString(), inline: true },
        { name: '🔮 Next Week Predicted', value: `~${totalPred.val} (${totalPred.change > 0 ? '+' : ''}${totalPred.change}%)`, inline: true },
        { name: '⚡ Commands Predicted', value: `~${cmdPred.val} next week`, inline: true }
      )
      
      ;
    await interaction.editReply({ embeds: [embed] });
  }
};
