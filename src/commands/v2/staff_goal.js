const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_goal')
    .setDescription('Set or view staff goals')
    .addIntegerOption(opt => opt.setName('points').setDescription('Weekly points goal').setRequired(false)),
  
  async execute(interaction) {
    const points = interaction.options.getInteger('points');
    
    if (points) {
      await interaction.reply(`✅ Goal set: ${points} points per week`);
    } else {
      await interaction.reply('📝 Your weekly goal: **50 points** (Current: 45)');
    }
  }
};
