const { SlashCommandBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('team_ranking')
    .setDescription('View team ranking')
    .addStringOption(opt => opt.setName('sort_by').setDescription('Sort by')
      .addChoices(
        { name: 'Points', value: 'points' },
        { name: 'Consistency', value: 'consistency' },
        { name: 'Shift Time', value: 'shiftTime' }
      )
      .setRequired(false))
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of users').setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const sortBy = interaction.options.getString('sort_by') || 'points';
    const limit = interaction.options.getInteger('limit') || 10;

    const sortField = {
      'points': 'staff.points',
      'consistency': 'staff.consistency',
      'shiftTime': 'staff.shiftTime'
    }[sortBy];

    const users = await User.find({
      'guilds.guildId': guildId,
      [sortField]: { $exists: true }
    })
      .sort({ [sortField]: -1 })
      .limit(limit)
      .lean();

    const embed = createPremiumEmbed()
      .setTitle(`🏆 Team Ranking (by ${sortBy})`)
      
      .setDescription(
        users.map((u, i) => {
          const guildData = u.guilds?.find(g => g.guildId === guildId);
          const name = guildData?.nickname || u.username || `User ${u.userId}`;
          const value = sortBy === 'points' ? u.staff?.points :
                        sortBy === 'consistency' ? `${u.staff?.consistency || 0}%` :
                        `${Math.round((u.staff?.shiftTime || 0) / 60)}h`;
          return `${i + 1}. ${name} - ${value}`;
        }).join('\n') || 'No ranking data found'
      )
      ;

    await interaction.reply({ embeds: [embed] });
  }
};



