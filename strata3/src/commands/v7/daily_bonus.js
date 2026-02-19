const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Activity } = require('../../database/mongo');

const DAILY_BONUS_COOLDOWN = 24 * 60 * 60 * 1000;
const DAILY_BONUS_POINTS = 50;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily_bonus')
    .setDescription('Claim your daily bonus'),
  async execute(interaction, client) {
    const userId = interaction.user.id;
    const now = new Date();

    const lastDaily = await Activity.findOne({
      userId,
      type: 'reward',
      'data.bonusType': 'daily'
    }).sort({ createdAt: -1 });

    if (lastDaily) {
      const timeSince = now - lastDaily.createdAt;
      if (timeSince < DAILY_BONUS_COOLDOWN) {
        const remaining = DAILY_BONUS_COOLDOWN - timeSince;
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        
        const embed = new EmbedBuilder()
          .setTitle('⏰ Daily Bonus')
          .setColor(0xe74c3c)
          .setDescription(`You can claim your next bonus in **${hours}h ${minutes}m**`);
        return interaction.reply({ embeds: [embed] });
      }
    }

    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({ userId, username: interaction.user.username });
    }

    user.staff = user.staff || {};
    user.staff.points = (user.staff.points || 0) + DAILY_BONUS_POINTS;
    await user.save();

    await Activity.create({
      userId,
      guildId: interaction.guild.id,
      type: 'reward',
      data: {
        bonus: true,
        bonusType: 'daily',
        points: DAILY_BONUS_POINTS,
        description: 'Daily bonus claimed'
      }
    });

    const embed = new EmbedBuilder()
      .setTitle('✅ Daily Bonus Claimed!')
      .setColor(0x2ecc71)
      .setDescription(`You received **${DAILY_BONUS_POINTS} points**!\nTotal points: ${user.staff.points}`)
      .setFooter({ text: 'Come back tomorrow for more!' });

    await interaction.reply({ embeds: [embed] });
  }
};
