const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_rewards')
    .setDescription('Configure auto rewards')
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable auto rewards').setRequired(false)),
  
  async execute(interaction) {
    const enabled = interaction.options.getBoolean('enabled');
    if (enabled !== null) {
      await interaction.reply(`✅ Auto rewards ${enabled ? 'enabled' : 'disabled'}`);
    } else {
      await interaction.reply('🎁 Auto rewards: **Enabled**\nReward interval: Daily\nBonus: 2x on weekends');
    }
  }
};
