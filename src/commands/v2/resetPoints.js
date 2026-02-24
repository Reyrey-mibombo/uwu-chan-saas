const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset_points')
    .setDescription('[Premium] Reset all staff points')
    .addBooleanOption(opt => opt.setName('confirm').setDescription('Confirm reset').setRequired(true)),

  async execute(interaction, client) {
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({ content: '❌ Admin only!', ephemeral: true });
    }

    const confirm = interaction.options.getBoolean('confirm');

    if (!confirm) {
      return interaction.reply({ content: '❌ Use `/reset_points confirm:true` to confirm.', ephemeral: true });
    }

    await User.updateMany(
      { 'staff.points': { $gt: 0 } },
      { $set: { 'staff.points': 0 } }
    );

    const embed = new EmbedBuilder()
      .setTitle('✅ Points Reset')
      .setDescription('All staff points have been reset to 0.')
      .setColor(0xe74c3c)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
