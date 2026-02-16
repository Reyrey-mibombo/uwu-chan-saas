const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_activity')
    .setDescription('Check member activity')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activities = await Activity.find({
      guildId,
      userId: target.id,
      createdAt: { $gte: weekAgo }
    });

    const messages = activities.filter(a => a.type === 'message').length;
    const commands = activities.filter(a => a.type === 'command').length;
    const shifts = activities.filter(a => a.type === 'shift').length;

    const embed = new EmbedBuilder()
      .setTitle(`📊 Activity Check: ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0x3498db)
      .addFields(
        { name: '💬 Messages (7d)', value: messages.toString(), inline: true },
        { name: '⚡ Commands (7d)', value: commands.toString(), inline: true },
        { name: '⏱️ Shifts (7d)', value: shifts.toString(), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
