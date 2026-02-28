const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed } = require('../../utils/embeds');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('bonus_points')
    .setDescription('Award bonus points to staff')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount of points').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for bonus').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, client) {
    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const reason = interaction.options.getString('reason') || 'Bonus';
    const staffSystem = client.systems.staff;
    const result = await staffSystem.addPoints(user.id, interaction.guildId, amount, reason);
    const embed = createCoolEmbed()
      .setTitle('? Bonus Points Awarded')
      .addFields(
        { name: 'User', value: user.tag, inline: true },
        { name: 'Amount', value: `+${amount}`, inline: true },
        { name: 'Total Now', value: `${result.total}`, inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      ;
    await interaction.reply({ embeds: [embed] });
  }
};
