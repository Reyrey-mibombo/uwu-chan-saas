const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get help and command list')
    .addStringOption(opt => opt.setName('command').setDescription('Get help for a specific command').setRequired(false)),
  
  async execute(interaction) {
    const commandName = interaction.options.getString('command');
    
    if (commandName) {
      const embed = createCoolEmbed()
        .setTitle(`Help: /${commandName}`)
        .setDescription('Command details')
        ;
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    const embed = createCoolEmbed()
      .setTitle('📚 Uwu-chan Bot Commands')
      .setDescription('Use `/buy` or `/premium` to upgrade!')
      .addFields(
        { name: '📋 General', value: '`/ping` `/server_info` `/roles_list` `/help`', inline: false },
        { name: '👥 Staff', value: '`/staff_profile` `/leaderboard` `/shift_start` `/shift_end`', inline: false },
        { name: '📊 Analytics', value: '`/staff_stats` `/daily_summary` `/activity_chart`', inline: false },
        { name: '🛡️ Moderation', value: '`/warn` `/mod_notes`', inline: false },
        { name: '💎 Premium', value: 'Use `/premium` to unlock v3, v4, v5 commands!', inline: false }
      )
      
      ;
    
    await interaction.reply({ embeds: [embed] });
  }
};



