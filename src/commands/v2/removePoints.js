const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove_points')
    .setDescription('[Premium] Remove points from a user')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to remove').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const reason = interaction.options.getString('reason') || 'No reason';

    let user = await User.findOne({ userId: targetUser.id });
    if (!user) {
      return interaction.reply({ content: '❌ User not found.', ephemeral: true });
    }

    if (!user.staff) user.staff = { points: 0 };
    user.staff.points = Math.max(0, (user.staff.points || 0) - amount);
    await user.save();

    const embed = createCoolEmbed()
      .setTitle('✅ Points Removed')
      
      .addFields(
        { name: '👤 User', value: targetUser.tag, inline: true },
        { name: '➖ Amount', value: `-${amount}`, inline: true },
        { name: '📝 Reason', value: reason, inline: true }
      )
      ;

    await interaction.reply({ embeds: [embed] });
  }
};



