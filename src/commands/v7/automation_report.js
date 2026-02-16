const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automation_report')
    .setDescription('View automation activity report')
    .addIntegerOption(opt => opt.setName('days').setDescription('Days to look back (default: 7)')),
  async execute(interaction, client) {
    const days = interaction.options.getInteger('days') || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const automations = await Activity.find({
      guildId: interaction.guild.id,
      type: { $in: ['promotion', 'task', 'reward'] },
      createdAt: { $gte: since }
    }).sort({ createdAt: -1 }).limit(20);

    const stats = {
      promotions: automations.filter(a => a.type === 'promotion').length,
      tasks: automations.filter(a => a.type === 'task').length,
      rewards: automations.filter(a => a.type === 'reward').length
    };

    const embed = new EmbedBuilder()
      .setTitle('📊 Automation Report')
      .setColor(0x1abc9c)
      .addFields(
        { name: 'Total Automations', value: `${automations.length}`, inline: true },
        { name: 'Promotions', value: `${stats.promotions}`, inline: true },
        { name: 'Tasks Completed', value: `${stats.tasks}`, inline: true },
        { name: 'Rewards Given', value: `${stats.rewards}`, inline: true },
        { name: 'Period', value: `Last ${days} days`, inline: true }
      );

    if (automations.length > 0) {
      embed.setDescription(automations.map(a => 
        `• ${a.type}: ${a.data?.description || 'N/A'} - ${new Date(a.createdAt).toLocaleDateString()}`
      ).join('\n'));
    }

    await interaction.reply({ embeds: [embed] });
  }
};
