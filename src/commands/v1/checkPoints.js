const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_points')
    .setDescription('Check your or another user\'s points')
    .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(false)),

  async execute(interaction, client) {
    const user = interaction.options.getUser('user') || interaction.user;
    const userData = await User.findOne({ userId: user.id });

    const points = userData?.staff?.points || 0;
    const rank = userData?.staff?.rank || 'member';
    const consistency = userData?.staff?.consistency || 100;

    const embed = new EmbedBuilder()
      .setTitle(`💰 ${user.username}'s Points`)
      .setColor(0xf1c40f)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: '⭐ Points', value: points.toString(), inline: true },
        { name: '🎖️ Rank', value: rank, inline: true },
        { name: '📈 Consistency', value: `${consistency}%`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
