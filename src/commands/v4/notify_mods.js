const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notify_mods')
    .setDescription('Notify moderators')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Message to send')
        .setRequired(true)),

  async execute(interaction) {
    const message = interaction.options.getString('message');
    const guildId = interaction.guildId;

    const mods = await User.find({
      'staff.rank': { $in: ['mod', 'admin', 'superadmin'] }
    });

    const modList = mods.map(m => `<@${m.userId}>`).join(', ') || 'No mods found';

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('🔔 Moderator Notification')
      
      .addFields(
        { name: 'Message', value: message, inline: false },
        { name: 'Notified', value: modList, inline: false }
      )
      
      ;

    const modChannel = interaction.guild.channels.cache.find(c =>
      c.name.includes('mod') || c.name.includes('staff') || c.name.includes('alert')
    );

    if (modChannel) {
      await modChannel.send({ content: '@here', embeds: [embed] });
      await interaction.reply({ content: 'Moderators have been notified!', ephemeral: true });
    } else {
      await interaction.reply({ embeds: [embed] });
    }
  }
};
