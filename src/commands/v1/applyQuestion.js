const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apply_questions')
    .setDescription('Customize application questions')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt => 
      opt.setName('type')
        .setDescription('Which application type')
        .setRequired(true)
        .addChoices(
          { name: '👮 Staff', value: 'staff' },
          { name: '🌟 Helper', value: 'helper' }
        ))
    .addStringOption(opt => opt.setName('q1').setDescription('Question 1 (Required)').setRequired(true))
    .addStringOption(opt => opt.setName('q2').setDescription('Question 2 (Required)').setRequired(true))
    .addStringOption(opt => opt.setName('q3').setDescription('Question 3').setRequired(true))
    .addStringOption(opt => opt.setName('q4').setDescription('Question 4').setRequired(false))
    .addStringOption(opt => opt.setName('q5').setDescription('Question 5 (Optional)').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const type = interaction.options.getString('type');
    const guild = await Guild.findOne({ guildId: interaction.guildId });
    
    if (!guild?.applicationConfig?.types?.[type]) {
      return interaction.editReply(`❌ ${type} system not set up yet!`);
    }
    
    const questions = [];
    for (let i = 1; i <= 5; i++) {
      const q = interaction.options.getString(`q${i}`);
      if (q) {
        questions.push({ 
          question: q, 
          required: i <= 3,
          type: i <= 2 ? 'paragraph' : 'short'
        });
      }
    }
    
    guild.applicationConfig.types[type].questions = questions;
    await guild.save();
    
    await interaction.editReply(`✅ Custom questions saved for ${type} applications!`);
  }
};