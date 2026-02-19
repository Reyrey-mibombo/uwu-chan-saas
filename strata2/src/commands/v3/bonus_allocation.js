const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bonus_allocation')
    .setDescription('Allocate bonus points to a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to give bonus points to')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('points')
        .setDescription('Amount of bonus points')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10000))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for bonus')
        .setRequired(false)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const points = interaction.options.getInteger('points');
    const reason = interaction.options.getString('reason') || 'General bonus';
    const guildId = interaction.guildId;
    const moderatorId = interaction.user.id;

    let user = await User.findOne({ userId: targetUser.id });
    if (!user) {
      user = new User({
        userId: targetUser.id,
        username: targetUser.username,
        guilds: [{ guildId, joinedAt: new Date() }]
      });
    }

    const guildMember = user.guilds?.find(g => g.guildId === guildId);
    if (guildMember) {
      if (!user.staff) user.staff = {};
      user.staff.points = (user.staff.points || 0) + points;
    } else {
      if (!user.staff) user.staff = { points: 0 };
      user.staff.points = (user.staff.points || 0) + points;
    }
    await user.save();

    await Activity.create({
      guildId,
      userId: targetUser.id,
      type: 'command',
      data: { 
        command: 'bonus_allocation', 
        points,
        reason,
        moderatorId
      }
    });

    const embed = new EmbedBuilder()
      .setTitle('💰 Bonus Points Allocated')
      .setColor(0xf1c40f)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'User', value: targetUser.username, inline: true },
        { name: 'Points Added', value: `+${points}`, inline: true },
        { name: 'New Total', value: user.staff.points.toString(), inline: true },
        { name: 'Reason', value: reason, inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
