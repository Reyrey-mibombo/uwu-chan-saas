const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

const RANKS = ['member', 'trial', 'moderator', 'senior', 'admin', 'owner'];
const POINTS_REQUIRED = { trial: 100, moderator: 500, senior: 1500, admin: 5000, owner: 15000 };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_upgrade')
    .setDescription('Upgrade your rank')
    .addStringOption(opt => opt.setName('rank').setDescription('Target rank').setRequired(true)
      .addChoices(...RANKS.slice(1).map(r => ({ name: r, value: r })))),
  async execute(interaction) {
    const targetRank = interaction.options.getString('rank');
    const user = await User.findOne({ userId: interaction.user.id });

    if (!user) {
      return interaction.reply({ content: 'User not found.', ephemeral: true });
    }

    const currentIndex = RANKS.indexOf(user.staff?.rank || 'member');
    const targetIndex = RANKS.indexOf(targetRank);

    if (targetIndex <= currentIndex) {
      return interaction.reply({ content: `You are already ${user.staff?.rank || 'member'} or higher.`, ephemeral: true });
    }

    const required = POINTS_REQUIRED[targetRank];
    if (user.staff.points < required) {
      return interaction.reply({ content: `You need ${required} points to upgrade to ${targetRank}. You have ${user.staff.points}.`, ephemeral: true });
    }

    user.staff.rank = targetRank;
    await user.save();

    await Activity.create({
      guildId: interaction.guildId,
      userId: interaction.user.id,
      type: 'promotion',
      data: { from: RANKS[currentIndex], to: targetRank }
    });

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('Rank Upgraded!')
      .setDescription(`Promoted from **${RANKS[currentIndex]}** to **${targetRank}**!`);

    await interaction.reply({ embeds: [embed] });
  }
};
