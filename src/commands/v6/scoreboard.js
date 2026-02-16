const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scoreboard')
    .setDescription('View staff scoreboard')
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of entries').setMinValue(5).setMaxValue(25).setDefaultValue(10)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const limit = interaction.options.getInteger('limit') || 10;
    
    const users = await User.find({ 'guilds.guildId': guildId, 'staff.points': { $gt: 0 } })
      .sort({ 'staff.points': -1 })
      .limit(limit);

    const scoreboard = users.length > 0
      ? users.map((u, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
          return `${medal} <@${u.userId}> - ${u.staff?.points || 0} pts (${u.staff?.consistency || 0}%)`;
        }).join('\n')
      : 'No scores available';

    const topUser = users[0];
    const embed = new EmbedBuilder()
      .setTitle('🏆 Scoreboard')
      .setColor(0xf1c40f)
      .addFields(
        { name: 'Leaderboard', value: scoreboard, inline: false },
        { name: 'Total Players', value: users.length.toString(), inline: true }
      )
      .setTimestamp();

    if (topUser) {
      embed.setFooter({ text: `Leader: ${topUser.username || 'Unknown'} with ${topUser.staff?.points || 0} points` });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
