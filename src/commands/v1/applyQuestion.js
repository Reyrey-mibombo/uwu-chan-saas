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
    guild.markModified('applicationConfig');
    await guild.save();

    const emoji = type === 'staff' ? '👮' : '🌟';
    const color = type === 'staff' ? 0x5865f2 : 0x9b59b6;

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle(`${emoji} ${type.toUpperCase()} Questions Updated`)
      .setDescription('The following questions have been configured for future applications:')
      
      ;

    questions.forEach((q, i) => {
      embed.addFields({
        name: `Question ${i + 1} ${q.required ? '(Required)' : '(Optional)'}`,
        value: `>>> ${q.question}`
      });
    });

    await interaction.editReply({ embeds: [embed] });
  }
};