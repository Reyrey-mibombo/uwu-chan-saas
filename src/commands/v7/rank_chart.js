const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_chart')
    .setDescription('View rank distribution chart')
    .addStringOption(opt => opt.setName('sort').setDescription('Sort by').addChoices(
      { name: 'Points', value: 'points' },
      { name: 'Members', value: 'members' }
    )),
  async execute(interaction, client) {
    const sortBy = interaction.options.getString('sort') || 'points';

    const users = await User.find({}).limit(100);
    const ranks = {};

    users.forEach(u => {
      const rank = u.staff?.rank || 'member';
      const points = u.staff?.points || 0;
      if (!ranks[rank]) ranks[rank] = { members: 0, totalPoints: 0 };
      ranks[rank].members++;
      ranks[rank].totalPoints += points;
    });

    const sortedRanks = Object.entries(ranks)
      .sort((a, b) => sortBy === 'points' 
        ? b[1].totalPoints - a[1].totalPoints 
        : b[1].members - a[1].members)
      .slice(0, 10);

    const maxMembers = Math.max(...sortedRanks.map(r => r[1].members));
    const chart = sortedRanks.map(([rank, data]) => {
      const bar = '▓'.repeat(Math.round((data.members / maxMembers) * 10)) + '░'.repeat(10 - Math.round((data.members / maxMembers) * 10));
      return `\`${bar}\` ${rank}: ${data.members} members (${data.totalPoints} pts)`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('📊 Rank Chart')
      .setColor(0x3498db)
      .setDescription(chart || 'No rank data available')
      .addFields({ name: 'Total Members', value: `${users.length}`, inline: true });

    await interaction.reply({ embeds: [embed] });
  }
};
