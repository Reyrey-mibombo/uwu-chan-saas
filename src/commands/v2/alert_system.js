const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alert_system')
    .setDescription('Configure custom alert rules')
    .addSubcommand(sub => sub.setName('add').setDescription('Add an alert').addStringOption(opt => opt.setName('name').setDescription('Alert name').setRequired(true)).addStringOption(opt => opt.setName('condition').setDescription('Alert condition').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('List all alerts'))
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove an alert').addStringOption(opt => opt.setName('name').setDescription('Alert name').setRequired(true))),
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: '❌ You need Manage Server permission', ephemeral: true });
    }
    
    const guildData = await Guild.findOne({ guildId: interaction.guild.id }) || new Guild({ guildId: interaction.guild.id });
    if (!guildData.alerts) guildData.alerts = [];
    
    if (subcommand === 'add') {
      const name = interaction.options.getString('name');
      const condition = interaction.options.getString('condition');
      
      guildData.alerts.push({ name, condition, createdBy: interaction.user.id });
      await guildData.save();
      
      return interaction.reply({ content: `✅ Alert "${name}" added!`, ephemeral: true });
    }
    
    if (subcommand === 'list') {
      const alerts = guildData.alerts.map(a => `• ${a.name}: ${a.condition}`).join('\n') || 'No alerts configured';
      
      const embed = createCoolEmbed()
        .setTitle('🔔 Custom Alerts')
        .setDescription(alerts)
        ;
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    if (subcommand === 'remove') {
      const name = interaction.options.getString('name');
      guildData.alerts = guildData.alerts.filter(a => a.name !== name);
      await guildData.save();
      
      return interaction.reply({ content: `✅ Alert "${name}" removed`, ephemeral: true });
    }
  }
};



