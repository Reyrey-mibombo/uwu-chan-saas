const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bonus_visual')
    .setDescription('View bonus visual summary')
    .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)')),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: targetUser.id });

    const bonusPoints = user?.staff?.bonusPoints || 0;
    const staffPoints = user?.staff?.points || 0;
    const totalPoints = bonusPoints + staffPoints;

    const bonusPercent = totalPoints > 0 ? Math.round((bonusPoints / totalPoints) * 100) : 0;
    const barLen = Math.round(bonusPercent / 5);
    const bar = '▓'.repeat(barLen) + '░'.repeat(20 - barLen);

    const embed = new EmbedBuilder()
      .setTitle('🎁 Bonus Visual')
      .setColor(0xf39c12)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'Total Points', value: `${totalPoints}`, inline: true },
        { name: 'Bonus Points', value: `${bonusPoints}`, inline: true },
        { name: 'Regular Points', value: `${staffPoints}`, inline: true }
      )
      .addFields({ name: 'Bonus Distribution', value: `\`${bar}\` ${bonusPercent}%`, inline: false });

    await interaction.reply({ embeds: [embed] });
  }
};
