const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievement_display')
    .setDescription('Display your achievements showcase')
    .addUserOption(opt => opt.setName('user').setDescription('User to display').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: target.id }).lean();
    const achievements = user?.staff?.achievements || [];
    const points = user?.staff?.points || 0;
    const rank = user?.staff?.rank || 'member';

    const rankEmojis = { owner: '👑', admin: '💜', manager: '💎', senior: '🌟', staff: '⭐', trial: '🔰', member: '👤' };
    const achieveDisplay = achievements.length
      ? achievements.map(a => `• ${a}`).join('\n')
      : '*No achievements yet — keep contributing!*';

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle(`🏅 Achievement Showcase — ${target.username}`)
      
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .setDescription(achieveDisplay)
      .addFields(
        { name: `${rankEmojis[rank] || '👤'} Rank`, value: rank.toUpperCase(), inline: true },
        { name: '⭐ Points', value: points.toString(), inline: true },
        { name: '🏅 Total Achievements', value: achievements.length.toString(), inline: true }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};
