const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notify_staff')
    .setDescription('Notify staff members')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Message to send to staff')
        .setRequired(true)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const message = interaction.options.getString('message');

    const staffMembers = await User.find({
      'guilds.guildId': guildId,
      'staff.points': { $gt: 0 }
    });

    if (staffMembers.length === 0) {
      return interaction.reply({ 
        content: 'No staff members found to notify.',
        ephemeral: true 
      });
    }

    const staffIds = staffMembers.map(u => u.userId);
    const staffMentions = staffIds.map(id => `<@${id}>`).join(', ');

    const embed = new EmbedBuilder()
      .setTitle('📢 Staff Notification')
      .setColor(0x3498db)
      .addFields(
        { name: 'Message', value: message, inline: false },
        { name: 'Sent to', value: `${staffMembers.length} staff members`, inline: true }
      )
      .setFooter({ text: `From: ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ 
      content: staffMentions,
      embeds: [embed]
    });
  }
};
