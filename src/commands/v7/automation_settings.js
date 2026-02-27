const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automation_settings')
    .setDescription('View or toggle automation module settings')
    .addStringOption(opt =>
      opt.setName('module')
        .setDescription('Module to toggle')
        .setRequired(false)
        .addChoices(
          { name: 'Moderation', value: 'moderation' },
          { name: 'Analytics', value: 'analytics' },
          { name: 'Automation', value: 'automation' },
          { name: 'Tickets', value: 'tickets' }
        ))
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const moduleChoice = interaction.options.getString('module');
    const enabledChoice = interaction.options.getBoolean('enabled');

    let guild = await Guild.findOne({ guildId });
    if (!guild) guild = new Guild({ guildId, name: interaction.guild.name });

    if (moduleChoice && enabledChoice !== null) {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.editReply('❌ You need **Manage Server** permission to change settings.');
      }
      guild.settings.modules[moduleChoice] = enabledChoice;
      await guild.save();
    }

    const modules = guild.settings?.modules || {};
    const statusIcon = v => v ? '✅ Enabled' : '❌ Disabled';

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('⚙️ Automation Settings')
      
      .addFields(
        { name: '🛡️ Moderation', value: statusIcon(modules.moderation), inline: true },
        { name: '📊 Analytics', value: statusIcon(modules.analytics), inline: true },
        { name: '🤖 Automation', value: statusIcon(modules.automation), inline: true },
        { name: '🎫 Tickets', value: statusIcon(modules.tickets), inline: true },
        { name: '📌 How to Toggle', value: 'Use `/automation_settings module:analytics enabled:true` to enable a module.' }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};
