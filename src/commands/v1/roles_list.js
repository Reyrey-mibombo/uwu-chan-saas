const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roles_list')
    .setDescription('List all roles in the server')
    .addBooleanOption(opt => opt.setName('hidden').setDescription('Show only to you').setRequired(false)),
  
  async execute(interaction) {
    const guild = interaction.guild;
    const roles = guild.roles.cache.sort((a, b) => b.position - a.position).map(r => r);
    
    const embed = new EmbedBuilder()
      .setTitle(`📋 Server Roles (${roles.length})`)
      .setDescription(roles.slice(0, 50).map(r => `${r} (${r.members.size})`).join('\n') || 'No roles')
      .setColor('#9b59b6')
      .setTimestamp();
    
    const hidden = interaction.options.getBoolean('hidden') || false;
    await interaction.reply({ embeds: [embed], ephemeral: hidden });
  }
};
