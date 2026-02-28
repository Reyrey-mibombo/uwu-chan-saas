const { SlashCommandBuilder } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('smart_notifications')
    .setDescription('View smart notification configuration for your server'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const guild = await Guild.findOne({ guildId }).lean();
    const modules = guild?.settings?.modules || {};

    const notifConfig = [
      { name: '📉 Activity Drop Alert', active: !!modules.analytics, desc: 'Fires when weekly activity drops >20%' },
      { name: '⬆️ Promotion Ready', active: !!modules.automation, desc: 'Fires when staff hits rank threshold' },
      { name: '⏰ Stuck Shift Alert', active: !!modules.moderation, desc: 'Fires when a shift is open 8+ hours' },
      { name: '⚠️ Warning Spike', active: !!modules.moderation, desc: 'Fires when warnings spike vs last week' },
    ];

    const fields = notifConfig.map(n => ({
      name: `${n.active ? '✅' : '❌'} ${n.name}`,
      value: n.desc,
      inline: true
    }));

    const logChannel = guild?.settings?.logChannel ? `<#${guild.settings.logChannel}>` : 'Not Set';

    const embed = createEnterpriseEmbed()
      .setTitle('🔔 Smart Notification Config')
      
      .addFields(
        { name: '📣 Log Channel', value: logChannel, inline: true },
        { name: '✅ Active Notifications', value: notifConfig.filter(n => n.active).length.toString(), inline: true },
        ...fields
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};



