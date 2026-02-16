const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_log')
    .setDescription('View recent activity log')
    .addIntegerOption(option => 
      option.setName('limit')
        .setDescription('Number of entries to show')
        .setMinValue(1)
        .setMaxValue(50)
        .setRequired(false)),

  async execute(interaction) {
    const limit = interaction.options.getInteger('limit') || 10;
    
    const activities = [
      { action: 'Shift started', user: 'Staff#1', time: '2 mins ago' },
      { action: 'Warning issued', user: 'Staff#2', time: '15 mins ago' },
      { action: 'Points awarded', user: 'Staff#3', time: '1 hour ago' }
    ].slice(0, limit);

    const embed = new EmbedBuilder()
      .setTitle('📋 Recent Activity Log')
      .setColor(0x2ecc71)
      .setDescription(activities.map(a => `**${a.action}** - ${a.user} (${a.time})`).join('\n'))
      .setFooter({ text: `Showing last ${activities.length} entries` });

    await interaction.reply({ embeds: [embed] });
  }
};
