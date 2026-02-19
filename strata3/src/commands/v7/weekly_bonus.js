const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

const WEEKLY_BONUS_COOLDOWN = 7 * 24 * 60 * 60 * 1000;
const WEEKLY_BONUS_POINTS = 200;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weekly_bonus')
    .setDescription('Claim your weekly bonus'),
  async execute(interaction, client) {
    const userId = interaction.user.id;
    const now = new Date();

    const lastWeekly = await Activity.findOne({
      userId,
      type: 'reward',
      'data.bonusType': 'weekly'
    }).sort({ createdAt: -1 });

    if (lastWeekly) {
      const timeSince = now - lastWeekly.createdAt;
      if (timeSince < WEEKLY_BONUS_COOLDOWN) {
        const daysLeft = Math.ceil((WEEKLY_BONUS_COOLDOWN - timeSince) / (24 * 60 * 60 * 1000));
        
        const embed = new EmbedBuilder()
          .setTitle('⏰ Weekly Bonus')
          .setColor(0xe74c3c)
          .setDescription(`You can claim your next weekly bonus in **${daysLeft} day(s)**`);
        return interaction.reply({ embeds: [embed] });
      }
    }

    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({ userId, username: interaction.user.username });
    }

    user.staff = user.staff || {};
    user.staff.points = (user.staff.points || 0) + WEEKLY_BONUS_POINTS;
    await user.save();

    await Activity.create({
      userId,
      guildId: interaction.guild.id,
      type: 'reward',
      data: {
        bonus: true,
        bonusType: 'weekly',
        points: WEEKLY_BONUS_POINTS,
        description: 'Weekly bonus claimed'
      }
    });

    const embed = new EmbedBuilder()
      .setTitle('✅ Weekly Bonus Claimed!')
      .setColor(0x2ecc71)
      .setDescription(`You received **${WEEKLY_BONUS_POINTS} points**!\nTotal points: ${user.staff.points}`)
      .setFooter({ text: 'Come back next week for more!' });

    await interaction.reply({ embeds: [embed] });
  }
};
