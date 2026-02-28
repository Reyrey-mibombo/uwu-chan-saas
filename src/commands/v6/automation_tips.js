const { SlashCommandBuilder } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automation_tips')
    .setDescription('Get tips for improving your server automation setup'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;

    const guild = await Guild.findOne({ guildId }).lean();
    const settings = guild?.settings || {};
    const modules = settings.modules || {};

    const tips = [
      {
        enabled: !!modules.moderation,
        name: '🛡️ Moderation Module',
        enabled_tip: 'Great! Use `/auto_warn` thresholds to auto-escalate repeat offenders.',
        disabled_tip: 'Enable moderation to get automatic warning escalation and anti-spam.'
      },
      {
        enabled: !!modules.analytics,
        name: '📊 Analytics Module',
        enabled_tip: 'Analytics active! Run `/analytics_trend` weekly to spot performance changes.',
        disabled_tip: 'Enable analytics to track member engagement and staff performance over time.'
      },
      {
        enabled: !!modules.automation,
        name: '⚙️ Automation Module',
        enabled_tip: 'Automation on! Set up point thresholds for automatic rank promotions.',
        disabled_tip: 'Enable automation to handle promotions, reminders, and rewards automatically.'
      },
      {
        enabled: !!modules.tickets,
        name: '🎫 Ticket System',
        enabled_tip: 'Ticket system active! Assign staff to tickets with `/task_assign` for faster resolution.',
        disabled_tip: 'Enable tickets to organize support requests and reduce noise in general channels.'
      }
    ];

    const fields = tips.map(t => ({
      name: `${t.enabled ? '✅' : '❌'} ${t.name}`,
      value: t.enabled ? t.enabled_tip : t.disabled_tip,
      inline: false
    }));

    const configured = tips.filter(t => t.enabled).length;

    const embed = createEnterpriseEmbed()
      .setTitle('💡 Automation Tips')
      
      .setDescription(`Your server has **${configured}/4** automation modules enabled.`)
      .addFields(fields)
      .addFields({
        name: '🔧 Quick Actions',
        value: '• Use `/automation_settings` to toggle modules\n• Use `/automation_suggestions` for personalized advice\n• Use `/server_health` to check overall status'
      })
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};



