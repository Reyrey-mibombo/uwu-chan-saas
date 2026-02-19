const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard_summary')
    .setDescription('View leaderboard summary'),

  async execute(interaction) {
    const guildId = interaction.guildId;

    const topStaff = await User.find({
      'guilds.guildId': guildId,
      'staff.points': { $gt: 0 }
    })
      .sort({ 'staff.points': -1 })
      .limit(10);

    if (topStaff.length === 0) {
      return interaction.reply({ 
        content: 'No staff members have earned points yet.',
        ephemeral: true 
      });
    }

    const totalPoints = topStaff.reduce((sum, u) => sum + (u.staff.points || 0), 0);
    const avgPoints = Math.round(totalPoints / topStaff.length);

    const embed = new EmbedBuilder()
      .setTitle('🏆 Leaderboard Summary')
      .setColor(0xf1c40f)
      .setDescription('Top 10 staff members by points')
      .addFields(
        { name: 'Total Staff', value: topStaff.length.toString(), inline: true },
        { name: 'Total Points', value: totalPoints.toLocaleString(), inline: true },
        { name: 'Average Points', value: avgPoints.toString(), inline: true }
      );

    const leaderList = topStaff.map((user, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const points = user.staff.points || 0;
      const consistency = user.staff.consistency || 0;
      return `${medal} <@${user.userId}> - ${points} pts (${consistency}%)`;
    });

    embed.addFields({ name: 'Rankings', value: leaderList.join('\n'), inline: false });
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
