const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievement_leaderboard')
    .setDescription('View achievement leaderboard'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const achievements = await Activity.find({ guildId, 'data.achievement': { $exists: true } })
      .sort({ createdAt: -1 })
      .limit(10);

    const embed = new EmbedBuilder()
      .setTitle('🏆 Achievement Leaderboard')
      .setColor(0xf1c40f)
      .setDescription(achievements.map(a => `<@${a.userId}> - ${a.data.achievement}`).join('\n') || 'No achievements yet');

    await interaction.reply({ embeds: [embed] });
  }
};
