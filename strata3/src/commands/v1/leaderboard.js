const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View staff leaderboard')
    .addIntegerOption(option => 
      option.setName('limit')
        .setDescription('Number of top staff to show')
        .setMinValue(3)
        .setMaxValue(20)
        .setRequired(false)),

  async execute(interaction, client) {
    const guildId = interaction.guildId;
    const limit = interaction.options.getInteger('limit') || 10;

    const users = await User.find({ 
      'guilds.guildId': guildId,
      'staff.points': { $gt: 0 }
    })
    .sort({ 'staff.points': -1 })
    .limit(limit);

    if (users.length === 0) {
      return interaction.reply({ 
        content: 'No staff members on the leaderboard yet. Start earning points!',
        ephemeral: true 
      });
    }

    let description = '';
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•';
      const points = user.staff?.points || 0;
      const rank = user.staff?.rank || 'member';
      description += `${medal} **${i + 1}.** <@${user.userId}> - ${points} pts (${rank})\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle('🏆 Staff Leaderboard')
      .setColor(0xf1c40f)
      .setDescription(description)
      .setFooter({ text: `${users.length} staff members ranked` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
