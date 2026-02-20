const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('feedback')
    .setDescription('Send feedback about the bot')
    .addStringOption(opt => opt.setName('message').setDescription('Your feedback').setRequired(true)),

  async execute(interaction) {
    const message = interaction.options.getString('message');
    
    const guildData = await Guild.findOne({ guildId: interaction.guildId }) || new Guild({ guildId: interaction.guildId });
    if (!guildData.feedback) guildData.feedback = [];
    guildData.feedback.push({
      userId: interaction.user.id,
      message,
      timestamp: new Date()
    });
    await guildData.save();
    
    await interaction.reply({ content: '✅ Feedback submitted! Thank you for helping us improve.', ephemeral: true });
  }
};
