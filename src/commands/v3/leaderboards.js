const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboards')
    .setDescription('View server leaderboards')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Leaderboard type')
        .setRequired(false)
        .addChoices(
          { name: 'Points', value: 'points' },
          { name: 'Consistency', value: 'consistency' },
          { name: 'Reputation', value: 'reputation' }
        ))
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Number of users to show')
        .setRequired(false)
        .setMinValue(5)
        .setMaxValue(25)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const type = interaction.options.getString('type') || 'points';
    const limit = interaction.options.getInteger('limit') || 10;

    const users = await User.find({
      'guilds.guildId': guildId
    }).lean();

    let sortedUsers = users
      .filter(u => u.staff)
      .sort((a, b) => {
        if (type === 'points') {
          return (b.staff?.points || 0) - (a.staff?.points || 0);
        } else if (type === 'consistency') {
          return (b.staff?.consistency || 0) - (a.staff?.consistency || 0);
        } else if (type === 'reputation') {
          return (b.staff?.reputation || 0) - (a.staff?.reputation || 0);
        }
        return 0;
      })
      .slice(0, limit);

    if (sortedUsers.length === 0) {
      return interaction.reply({ content: 'No users found on the leaderboard yet.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`🏆 ${type.charAt(0).toUpperCase() + type.slice(1)} Leaderboard`)
      .setColor(0xf1c40f)
      .setDescription(`Top ${sortedUsers.length} users by ${type}`);

    const leaderboardEntries = [];
    const medals = ['🥇', '🥈', '🥉'];

    for (let i = 0; i < sortedUsers.length; i++) {
      const user = sortedUsers[i];
      const displayName = user.username || `User ${user.userId}`;
      let value = '0';
      
      if (type === 'points') value = (user.staff?.points || 0).toString();
      else if (type === 'consistency') value = `${user.staff?.consistency || 0}%`;
      else if (type === 'reputation') value = (user.staff?.reputation || 0).toString();

      const medal = i < 3 ? medals[i] : `${i + 1}.`;
      leaderboardEntries.push(`${medal} **${displayName}** - ${value}`);
    }

    embed.addFields({ name: 'Rankings', value: leaderboardEntries.join('\n'), inline: false });

    await interaction.reply({ embeds: [embed] });
  }
};
