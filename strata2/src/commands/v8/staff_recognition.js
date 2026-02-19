const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_recognition')
    .setDescription('Recognize staff achievements')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member to recognize').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for recognition').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    let user = await User.findOne({ userId: target.id });
    if (!user) {
      user = await User.create({ userId: target.id, staff: { rank: 'member', points: 0, reputation: 0 } });
    }

    user.staff.reputation = (user.staff.reputation || 0) + 10;
    user.staff.points = (user.staff.points || 0) + 50;
    await user.save();

    await Activity.create({
      guildId: interaction.guildId,
      userId: target.id,
      type: 'promotion',
      data: { type: 'recognition', reason }
    });

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('Staff Recognition')
      .setDescription(`**${target.tag}** has been recognized!`)
      .addFields({ name: 'Reason', value: reason })
      .addFields(
        { name: 'Points Earned', value: '+50', inline: true },
        { name: 'Reputation', value: '+10', inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
