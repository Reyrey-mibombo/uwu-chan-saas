const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('season_summary')
    .setDescription('View current season summary'),
  async execute(interaction) {
    const seasonStart = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    const seasonLength = 90;

    const stats = await Activity.aggregate([
      { $match: { guildId: interaction.guildId, createdAt: { $gte: seasonStart } } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const total = stats.reduce((sum, s) => sum + s.count, 0);
    const commands = stats.find(s => s._id === 'command')?.count || 0;
    const promotions = stats.find(s => s._id === 'promotion')?.count || 0;
    const shifts = stats.find(s => s._id === 'shift')?.count || 0;

    const embed = new EmbedBuilder()
      .setColor(0x4B0082)
      .setTitle('Season Summary')
      .setDescription(`Day 45 of ${seasonLength}`)
      .addFields(
        { name: 'Total Activity', value: `${total}`, inline: true },
        { name: 'Commands', value: `${commands}`, inline: true },
        { name: 'Promotions', value: `${promotions}`, inline: true },
        { name: 'Shifts', value: `${shifts}`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
