const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_log')
    .setDescription('View recent activity log')
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of entries').setMinValue(1).setMaxValue(50).setRequired(false)),
  
  async execute(interaction) {
    const limit = interaction.options.getInteger('limit') || 10;
    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
    
    const activities = guildData?.activityLog?.slice(0, limit) || [];
    const embed = new EmbedBuilder()
      .setTitle('📋 Activity Log')
      .setDescription(activities.length > 0 ? activities.map(a => `• ${a.action} - ${a.user} (${a.time})`).join('\n') : 'No recent activity')
      .setColor('#2ecc71')
      .setFooter({ text: `Showing ${activities.length} entries` });
    
    await interaction.reply({ embeds: [embed] });
  }
};
