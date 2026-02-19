const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_summary')
    .setDescription('View rank summary')
    .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)')),
  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user') || interaction.user;

    const user = await User.findOne({ userId: targetUser.id });
    const points = user?.staff?.points || 0;
    const rank = user?.staff?.rank || 'member';
    const reputation = user?.staff?.reputation || 0;
    const achievements = user?.staff?.achievements?.length || 0;

    const ranks = [
      { name: 'member', min: 0 },
      { name: 'regular', min: 100 },
      { name: 'veteran', min: 500 },
      { name: 'elite', min: 1000 },
      { name: 'master', min: 2500 },
      { name: 'legend', min: 5000 }
    ];

    const currentRank = ranks.find(r => r.name === rank) || ranks[0];
    const nextRank = ranks.find(r => r.min > points);
    const progress = nextRank 
      ? Math.round((points / nextRank.min) * 100) 
      : 100;
    const bar = '█'.repeat(Math.min(Math.floor(progress / 10), 10)) + '░'.repeat(10 - Math.min(Math.floor(progress / 10), 10));

    const embed = new EmbedBuilder()
      .setTitle('📋 Rank Summary')
      .setColor(0x9b59b6)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'Current Rank', value: rank.charAt(0).toUpperCase() + rank.slice(1), inline: true },
        { name: 'Points', value: `${points}`, inline: true },
        { name: 'Reputation', value: `${reputation}`, inline: true },
        { name: 'Achievements', value: `${achievements}`, inline: true },
        { name: 'Progress to Next Rank', value: `\`${bar}\` ${progress}%`, inline: false }
      );

    if (nextRank) {
      embed.addFields({ name: 'Next Rank', value: `${nextRank.name} (${nextRank.min} pts)`, inline: true });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
