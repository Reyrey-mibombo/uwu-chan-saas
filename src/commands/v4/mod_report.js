const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod_report')
    .setDescription('Submit a report to moderators')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to report')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for report')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('evidence')
        .setDescription('Additional evidence')
        .setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const evidence = interaction.options.getString('evidence');
    const guildId = interaction.guildId;

    await Activity.create({
      guildId,
      userId: target.id,
      type: 'command',
      data: {
        action: 'mod_report',
        reason,
        evidence,
        reportedBy: interaction.user.id,
        status: 'pending'
      }
    });

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('📨 Report Submitted')
      
      .addFields(
        { name: 'Reported User', value: target.tag, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      
      ;

    if (evidence) {
      embed.addFields({ name: 'Evidence', value: evidence, inline: false });
    }

    const modChannel = interaction.guild.channels.cache.find(c =>
      c.name.includes('mod') || c.name.includes('report') || c.name.includes('staff')
    );

    if (modChannel) {
      await modChannel.send({ embeds: [embed] });
    }

    await interaction.reply({ content: 'Report submitted successfully!', ephemeral: true });
  }
};
