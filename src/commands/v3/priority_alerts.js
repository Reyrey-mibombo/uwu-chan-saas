const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('priority_alerts')
    .setDescription('Algorithmic analysis of server threat vectors sorted by threat level limiters.')
    .addStringOption(option =>
      option.setName('filter')
        .setDescription('Index targets by severity priority constraint')
        .setRequired(false)
        .addChoices(
          { name: 'Critical Vectors (High Priority)', value: 'high' },
          { name: 'Sub-Critical (Medium Priority)', value: 'medium' },
          { name: 'Passive Routine (Low Priority)', value: 'low' },
          { name: 'Full Threat Array', value: 'all' }
        )),

  async execute(interaction) {
    try {
      await interaction.deferReply();
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

      const highPriority = await Activity.countDocuments({ guildId, type: 'alert', 'data.priority': 'high', 'data.status': 'active' });
      const mediumPriority = await Activity.countDocuments({ guildId, type: 'alert', 'data.priority': 'medium', 'data.status': 'active' });
      const lowPriority = await Activity.countDocuments({ guildId, type: 'alert', 'data.priority': 'low', 'data.status': 'active' });

      const embed = await createCustomEmbed(interaction, {
        title: `🚨 Server Priority Index`,
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `Reviewing active threat vectors targeting algorithmic bounds for **${interaction.guild.name}**.`,
        fields: [
          { name: '🔴 High Priority Queue', value: `\`${highPriority}\` Vectors`, inline: true },
          { name: '🟡 Medi-Tier Queue', value: `\`${mediumPriority}\` Vectors`, inline: true },
          { name: '🟢 Low End Queue', value: `\`${lowPriority}\` Backgrounds`, inline: true }
        ]
      });

      if (alerts.length > 0) {
        const alertList = alerts.map(alert => {
          const priority = alert.data?.priority || 'medium';
          const emoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
          const status = alert.data?.status || 'active';
          const title = alert.data?.title || 'Unknown Origin';

          const unixTime = Math.floor(new Date(alert.createdAt).getTime() / 1000);
          return `> ${emoji} **${title}** ➔ \`${status.toUpperCase()}\` (<t:${unixTime}:R>)`;
        });
        embed.addFields({ name: `📋 Target Filter: ${filter.toUpperCase()}`, value: alertList.join('\n'), inline: false });
      } else {
        embed.addFields({ name: `📋 Target Filter: ${filter.toUpperCase()}`, value: '*No traces match indexing algorithms.*', inline: false });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Priority Alerts Error:', error);
      const errEmbed = createErrorEmbed('A database tracking error occurred resolving backend threat aggregators.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
