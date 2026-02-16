const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievement_chart')
    .setDescription('View your achievement chart')
    .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)')),
  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: targetUser.id });
    
    const achievements = user?.staff?.achievements || [];
    const total = 20;
    const completed = achievements.length;
    const progress = Math.round((completed / total) * 10);
    const bar = '█'.repeat(progress) + '░'.repeat(10 - progress);

    const embed = new EmbedBuilder()
      .setTitle('🏆 Achievement Chart')
      .setColor(0x9b59b6)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'User', value: targetUser.username, inline: true },
        { name: 'Completed', value: `${completed}/${total}`, inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: 'Progress', value: `\`${bar}\` ${completed * 5}%`, inline: false }
      )
      .setDescription(achievements.length > 0 ? achievements.map((a, i) => `${i + 1}. ${a}`).join('\n') : 'No achievements yet');

    await interaction.reply({ embeds: [embed] });
  }
};
