const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server_trends')
    .setDescription('View server trends')
    .addIntegerOption(opt => opt.setName('days').setDescription('Number of days').setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const days = interaction.options.getInteger('days') || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [currentPeriod, previousPeriod] = await Promise.all([
      Activity.find({ guildId, createdAt: { $gte: startDate } }),
      Activity.find({ guildId, createdAt: { $gte: new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000), $lt: startDate } })
    ]);

    const currentMessages = currentPeriod.filter(a => a.type === 'message').length;
    const previousMessages = previousPeriod.filter(a => a.type === 'message').length;
    const currentUsers = new Set(currentPeriod.map(a => a.userId)).size;
    const previousUsers = new Set(previousPeriod.map(a => a.userId)).size;

    const calcTrend = (curr, prev) => {
      if (prev === 0) return curr > 0 ? '+100%' : '0%';
      const change = ((curr - prev) / prev * 100).toFixed(1);
      return `${change > 0 ? '+' : ''}${change}%`;
    };

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('📈 Server Trends')
      
      .addFields(
        { name: 'Messages', value: `${currentMessages} (${calcTrend(currentMessages, previousMessages)})`, inline: true },
        { name: 'Active Users', value: `${currentUsers} (${calcTrend(currentUsers, previousUsers)})`, inline: true },
        { name: 'Period', value: `${days} days`, inline: true }
      )
      .setDescription(
        currentMessages >= previousMessages ? '📈 Trending Up' : '📉 Trending Down'
      )
      ;

    await interaction.reply({ embeds: [embed] });
  }
};
