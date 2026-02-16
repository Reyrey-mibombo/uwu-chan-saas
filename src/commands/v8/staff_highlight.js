const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_highlight')
    .setDescription('Highlight a staff member')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member to highlight').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const user = await User.findOne({ userId: target.id });

    if (!user) {
      return interaction.reply({ content: 'User not found.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0xFF6B6B)
      .setTitle('Staff Spotlight')
      .setThumbnail(target.displayAvatarURL())
      .setDescription(`**${target.tag}** is being highlighted!`)
      .addFields(
        { name: 'Rank', value: user.staff?.rank || 'member', inline: true },
        { name: 'Points', value: `${user.staff?.points || 0}`, inline: true },
        { name: 'Reputation', value: `${user.staff?.reputation || 0}`, inline: true },
        { name: 'Shift Time', value: `${user.staff?.shiftTime || 0} hours`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
