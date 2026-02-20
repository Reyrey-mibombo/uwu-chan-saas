const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_log')
    .setDescription('View recent activity log')
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of entries').setRequired(false)),

  async execute(interaction, client) {
    const limit = interaction.options.getInteger('limit') || 10;
    const Activity = require('../../database/mongo').Activity;
    
    const activities = await Activity.find({ guildId: interaction.guildId })
      .sort({ createdAt: -1 })
      .limit(limit);
    
    if (activities.length === 0) {
      return interaction.reply({ content: 'No activity recorded yet', ephemeral: true });
    }
    
    const activityList = await Promise.all(activities.map(async (a) => {
      const user = await interaction.client.users.fetch(a.userId).catch(() => null);
      const userName = user?.username || 'Unknown';
      let action = a.type;
      if (a.data?.action) action += ` (${a.data.action})`;
      return `• ${action} - ${userName} - <t:${Math.floor(a.createdAt.getTime()/1000)}:R>`;
    }));
    
    const embed = new EmbedBuilder()
      .setTitle('📋 Activity Log')
      .setDescription(activityList.join('\n'))
      .setColor('#2ecc71')
      .setFooter({ text: `Showing ${activities.length} entries` });

    await interaction.reply({ embeds: [embed] });
  }
};
