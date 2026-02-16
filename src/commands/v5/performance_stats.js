const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('performance_stats')
    .setDescription('View performance statistics')
    .addUserOption(opt => opt.setName('user').setDescription('User to view stats for').setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const targetUser = interaction.options.getUser('user');
    const userId = targetUser?.id;

    if (userId) {
      const user = await User.findOne({ userId });
      if (!user) {
        await interaction.reply({ content: 'User not found in database.' });
        return;
      }

      const guildData = user.guilds?.find(g => g.guildId === guildId);
      const staff = user.staff || {};

      const embed = new EmbedBuilder()
        .setTitle(`📊 Performance Stats: ${targetUser.username}`)
        .setColor(0x2ecc71)
        .addFields(
          { name: 'Points', value: staff.points?.toString() || '0', inline: true },
          { name: 'Warnings', value: staff.warnings?.toString() || '0', inline: true },
          { name: 'Shift Time', value: `${Math.round((staff.shiftTime || 0) / 60)}h`, inline: true },
          { name: 'Consistency', value: `${staff.consistency || 100}%`, inline: true },
          { name: 'Reputation', value: staff.reputation?.toString() || '0', inline: true },
          { name: 'Rank', value: staff.rank || 'member', inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else {
      const users = await User.find({ 'guilds.guildId': guildId, 'staff.points': { $exists: true } }).lean();

      const totalPoints = users.reduce((sum, u) => sum + (u.staff?.points || 0), 0);
      const totalWarnings = users.reduce((sum, u) => sum + (u.staff?.warnings || 0), 0);
      const totalShiftTime = users.reduce((sum, u) => sum + (u.staff?.shiftTime || 0), 0);
      const avgConsistency = users.length > 0
        ? users.reduce((sum, u) => sum + (u.staff?.consistency || 100), 0) / users.length
        : 100;

      const embed = new EmbedBuilder()
        .setTitle('📊 Server Performance Stats')
        .setColor(0x2ecc71)
        .addFields(
          { name: 'Staff Count', value: users.length.toString(), inline: true },
          { name: 'Total Points', value: totalPoints.toString(), inline: true },
          { name: 'Total Warnings', value: totalWarnings.toString(), inline: true },
          { name: 'Total Shift Time', value: `${Math.round(totalShiftTime / 60)}h`, inline: true },
          { name: 'Avg Consistency', value: `${avgConsistency.toFixed(1)}%`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  }
};
