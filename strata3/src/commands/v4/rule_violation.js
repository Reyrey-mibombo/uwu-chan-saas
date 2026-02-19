const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rule_violation')
    .setDescription('Report a rule violation')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User who violated rules')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('rule')
        .setDescription('Rule violated')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Violation description')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('severity')
        .setDescription('Severity level')
        .setRequired(false)
        .addChoices(
          { name: 'Low', value: 'low' },
          { name: 'Medium', value: 'medium' },
          { name: 'High', value: 'high' }
        )),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const rule = interaction.options.getString('rule');
    const description = interaction.options.getString('description');
    const severity = interaction.options.getString('severity') || 'medium';
    const guildId = interaction.guildId;

    const violation = await Activity.create({
      guildId,
      userId: target.id,
      type: 'warning',
      data: {
        action: 'rule_violation',
        rule,
        description,
        severity,
        reportedBy: interaction.user.id,
        status: 'pending'
      }
    });

    const embed = new EmbedBuilder()
      .setTitle('⚠️ Rule Violation Reported')
      .setColor(severity === 'high' ? 0xe74c3c : severity === 'medium' ? 0xf39c12 : 0x3498db)
      .addFields(
        { name: 'User', value: target.tag, inline: true },
        { name: 'Rule', value: rule, inline: true },
        { name: 'Severity', value: severity.toUpperCase(), inline: true },
        { name: 'Description', value: description, inline: false }
      )
      .setFooter({ text: `Reported by ${interaction.user.username}` })
      .setTimestamp();

    const modChannel = interaction.guild.channels.cache.find(c =>
      c.name.includes('mod') || c.name.includes('log') || c.name.includes('violation')
    );

    if (modChannel) {
      await modChannel.send({ embeds: [embed] });
    }

    await interaction.reply({ content: 'Rule violation has been recorded!', ephemeral: true });
  }
};
