const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_prediction')
    .setDescription('Predict staff performance based on historical data')
    .addIntegerOption(opt => opt.setName('days').setDescription('Days of history').setMinValue(14).setMaxValue(60)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const days = interaction.options.getInteger('days') || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const users = await User.find({ 'guilds.guildId': guildId, 'staff.rank': { $ne: 'member' } });
    const activities = await Activity.find({ guildId, createdAt: { $gte: startDate } });

    const predictions = users.map(u => {
      const consistency = u.staff?.consistency || 0;
      const points = u.staff?.points || 0;
      const shiftTime = u.staff?.shiftTime || 0;
      
      const score = consistency * 0.4 + Math.min(100, points / 5) * 0.3 + Math.min(100, shiftTime / 10) * 0.3;
      const prediction = score >= 80 ? 'High' : score >= 50 ? 'Medium' : 'Low';
      
      return {
        userId: u.userId,
        score: Math.round(score),
        prediction,
        consistency,
        points
      };
    }).sort((a, b) => b.score - a.score);

    const topPerformer = predictions[0];
    const avgScore = predictions.length > 0 
      ? predictions.reduce((sum, p) => sum + p.score, 0) / predictions.length 
      : 0;

    const embed = new EmbedBuilder()
      .setTitle('🔮 Staff Prediction')
      .setColor(0x8e44ad)
      .addFields(
        { name: 'Avg Predicted Score', value: `${avgScore.toFixed(1)}/100`, inline: true },
        { name: 'Staff Analyzed', value: users.length.toString(), inline: true },
        { name: 'Data Days', value: days.toString(), inline: true }
      )
      .setTimestamp();

    if (topPerformer) {
      embed.addFields({ 
        name: 'Top Performer Prediction', 
        value: `<@${topPerformer.userId}> - ${topPerformer.prediction} (${topPerformer.score}/100)`, 
        inline: false 
      });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
