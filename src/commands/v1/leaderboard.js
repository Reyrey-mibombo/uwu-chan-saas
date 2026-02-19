const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Staff activity leaderboard rankings')
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of users to show').setRequired(false)),
  
  async execute(interaction) {
    const limit = interaction.options.getInteger('limit') || 10;
    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
    
    if (!guildData?.shifts || guildData.shifts.length === 0) {
      return interaction.reply({ content: 'No shift data available yet', ephemeral: true });
    }
    
    const userStats = {};
    guildData.shifts.forEach(shift => {
      if (!shift.endTime) return;
      if (!userStats[shift.userId]) userStats[shift.userId] = 0;
      const duration = (shift.endTime - shift.startTime) / 60000;
      userStats[shift.userId] += duration;
    });
    
    const sorted = Object.entries(userStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
    
    const leaderboard = await Promise.all(sorted.map(async ([userId, minutes], index) => {
      const user = await interaction.client.users.fetch(userId).catch(() => null);
      return `**${index + 1}.** ${user?.username || 'Unknown'} - ${Math.round(minutes)} minutes`;
    }));
    
    const embed = new EmbedBuilder()
      .setTitle('🏆 Staff Leaderboard')
      .setDescription(leaderboard.join('\n') || 'No data')
      .setColor('#feca57')
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
};
