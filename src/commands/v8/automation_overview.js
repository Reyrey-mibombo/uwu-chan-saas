const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automation_overview')
    .setDescription('Visual overview of all automation configurations'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const guild = await Guild.findOne({ guildId }).lean();
    const modules = guild?.settings?.modules || {};
    const settings = guild?.settings || {};

    const moduleStatus = [
      ['🛡️ Moderation', modules.moderation],
      ['📊 Analytics', modules.analytics],
      ['⚙️ Automation', modules.automation],
      ['🎫 Tickets', modules.tickets],
    ].map(([name, enabled]) => `${enabled ? '🟢' : '🔴'} ${name}: **${enabled ? 'ON' : 'OFF'}**`).join('\n');

    const configStatus = [
      ['📣 Log Channel', settings.logChannel ? `<#${settings.logChannel}>` : '❌ Not set'],
      ['👤 Muted Role', settings.mutedRole ? `<@&${settings.mutedRole}>` : '❌ Not set'],
      ['🌍 Timezone', settings.timezone || 'UTC'],
      ['🔔 Welcome Channel', settings.welcomeChannel ? `<#${settings.welcomeChannel}>` : '❌ Not set'],
    ].map(([name, val]) => `${name}: **${val}**`).join('\n');

    const activeCount = [modules.moderation, modules.analytics, modules.automation, modules.tickets].filter(Boolean).length;

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('⚙️ Automation Overview')
      
      .addFields(
        { name: `🤖 Modules (${activeCount}/4 Active)`, value: moduleStatus },
        { name: '🔧 Configuration', value: configStatus }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};
