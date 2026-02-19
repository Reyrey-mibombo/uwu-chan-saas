const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_warn')
    .setDescription('Automatically warn users based on configured rules')
    .addSubcommand(sub => sub.setName('enable').setDescription('Enable auto-warn').addStringOption(opt => opt.setName('trigger').setDescription('Trigger keyword').setRequired(true)))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disable auto-warn'))
    .addSubcommand(sub => sub.setName('list').setDescription('List auto-warn rules')),
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: '❌ You need Manage Server permission', ephemeral: true });
    }
    
    const guildData = await Guild.findOne({ guildId: interaction.guild.id }) || new Guild({ guildId: interaction.guild.id });
    if (!guildData.autoWarn) guildData.autoWarn = { enabled: false, triggers: [] };
    
    if (subcommand === 'enable') {
      const trigger = interaction.options.getString('trigger').toLowerCase();
      guildData.autoWarn.enabled = true;
      if (!guildData.autoWarn.triggers.includes(trigger)) {
        guildData.autoWarn.triggers.push(trigger);
      }
      await guildData.save();
      
      return interaction.reply({ content: `✅ Auto-warn enabled for: "${trigger}"`, ephemeral: true });
    }
    
    if (subcommand === 'disable') {
      guildData.autoWarn.enabled = false;
      await guildData.save();
      
      return interaction.reply({ content: '❎ Auto-warn disabled', ephemeral: true });
    }
    
    if (subcommand === 'list') {
      const triggers = guildData.autoWarn.triggers.join('\n') || 'No triggers set';
      const embed = new EmbedBuilder()
        .setTitle('⚠️ Auto-Warn Rules')
        .setDescription(`**Status:** ${guildData.autoWarn.enabled ? '✅ Enabled' : '❌ Disabled'}\n\n**Triggers:**\n${triggers}`)
        .setColor('#e74c3c');
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
