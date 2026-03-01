const { SlashCommandBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
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

    const modList = mods.map(m => `<@${m.userId}>`).join(', ') || '*No active responders detected.*';

    const embed = await createCustomEmbed(interaction, {
      title: '🔔 Moderator Dispatch Terminal',
      thumbnail: interaction.guild.iconURL({ dynamic: true }),
      description: `### 🛡️ High-Priority Signal Intelligence\nActive broadcast initiated from sector **${interaction.guild.name}**. Dispatching authorized personnel to the coordinates below.`,
      fields: [
        { name: '📡 Dispatch Payload', value: `> ${message}`, inline: false },
        { name: '👥 Targeted Responders', value: modList, inline: false },
        { name: '⚖️ Priority Level', value: '`🔵 NORMAL` | `Guardian V4 Dispatch`', inline: true }
      ],
      footer: 'Signal Broadcast Authenticated • V4 Guardian Suite',
      color: 'premium'
    });

    const modChannel = interaction.guild.channels.cache.find(c =>
      c.name.includes('mod') || c.name.includes('staff') || c.name.includes('alert')
    );

    if (modChannel) {
      await modChannel.send({ content: '📡 **Signal Alert @here**', embeds: [embed] });
      await interaction.reply({ content: 'Signal broadcast successful. Responders have been notified.', ephemeral: true });
    } else {
      await interaction.reply({ embeds: [embed] });
    }
  }


