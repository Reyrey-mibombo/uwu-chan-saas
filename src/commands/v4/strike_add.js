const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strike_add')
    .setDescription('Add strike to user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to strike')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for strike')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const guildId = interaction.guildId;

    let user = await User.findOne({ userId: target.id });
    if (!user) {
      user = new User({ userId: target.id, username: target.username });
    }
    if (!user.staff) user.staff = {};
    user.staff.warnings = (user.staff.warnings || 0) + 1;
    await user.save();

    await Activity.create({
      guildId,
      userId: target.id,
      type: 'warning',
      data: { action: 'strike', reason, moderatorId: interaction.user.id }
    });

    const embed = createPremiumEmbed()
      .setTitle('⚡ Strike Added')
      
      .addFields(
        { name: 'User', value: target.tag, inline: true },
        { name: 'Reason', value: reason, inline: true },
        { name: 'Total Strikes', value: user.staff.warnings.toString(), inline: true }
      )
      
      ;

    await interaction.reply({ embeds: [embed] });
  }
};



