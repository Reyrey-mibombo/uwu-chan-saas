const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add_reputation')
    .setDescription('[Premium] Add reputation points to a user')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to add').setRequired(true)),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    let user = await User.findOne({ userId: targetUser.id });
    if (!user) {
      user = new User({ userId: targetUser.id, username: targetUser.tag });
    }

    if (!user.staff) user.staff = {};
    user.staff.reputation = (user.staff.reputation || 0) + amount;
    await user.save();

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('✅ Reputation Added')
      
      .addFields(
        { name: '👤 User', value: targetUser.tag, inline: true },
        { name: '➕ Added', value: `+${amount}`, inline: true },
        { name: '💫 Total', value: user.staff.reputation.toString(), inline: true }
      )
      ;

    await interaction.reply({ embeds: [embed] });
  }
};
