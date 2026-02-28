const { SlashCommandBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('priority_alerts')
    .setDescription('View and manage priority alerts')
    .addStringOption(option =>
      option.setName('filter')
        .setDescription('Filter alerts by priority')
        .setRequired(false)
        .addChoices(
          { name: 'High', value: 'high' },
          { name: 'Medium', value: 'medium' },
          { name: 'Low', value: 'low' },
          { name: 'All', value: 'all' }
        )),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const filter = interaction.options.getString('filter') || 'all';

    const query = { guildId, type: 'alert' };
    if (filter !== 'all') {
      query['data.priority'] = filter;
    }

    const alerts = await Activity.find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const highPriority = await Activity.countDocuments({ 
      guildId, 
      type: 'alert',
      'data.priority': 'high',
      'data.status': 'active'
    });

    const mediumPriority = await Activity.countDocuments({ 
      guildId, 
      type: 'alert',
      'data.priority': 'medium',
      'data.status': 'active'
    });

    const lowPriority = await Activity.countDocuments({ 
      guildId, 
      type: 'alert',
      'data.priority': 'low',
      'data.status': 'active'
    });

    const embed = createPremiumEmbed()
      .setTitle('🚨 Priority Alerts')
      
      .setDescription(`Priority alerts for ${interaction.guild.name}`);

    embed.addFields(
      { name: '🔴 High', value: highPriority.toString(), inline: true },
      { name: '🟡 Medium', value: mediumPriority.toString(), inline: true },
      { name: '🟢 Low', value: lowPriority.toString(), inline: true }
    );

    if (alerts.length > 0) {
      const alertList = alerts.map(alert => {
        const priority = alert.data?.priority || 'medium';
        const emoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
        const status = alert.data?.status || 'active';
        const title = alert.data?.title || 'Alert';
        const date = new Date(alert.createdAt).toLocaleDateString();
        return `${emoji} **${title}** (${status}) - ${date}`;
      });
      embed.addFields({ name: 'Recent Alerts', value: alertList.join('\n'), inline: false });
    } else {
      embed.addFields({ name: 'Recent Alerts', value: 'No alerts found', inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  }
};



