const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reward_display')
    .setDescription('Display your earned rewards and badges')
    .addUserOption(opt => opt.setName('user').setDescription('User to view').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: target.id }).lean();
    const pts = user?.staff?.points || 0;
    const BADGES = [{ min: 2000, badge: '👑 Legend' }, { min: 1000, badge: '💎 Diamond' }, { min: 500, badge: '🥇 Gold' }, { min: 150, badge: '🥈 Silver' }, { min: 50, badge: '🥉 Bronze' }];
    const earned = BADGES.filter(b => pts >= b.min).map(b => b.badge);
    const next = BADGES.find(b => pts < b.min);
    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle(`🎁 Reward Display — ${target.username}`)
      
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '⭐ Points', value: pts.toString(), inline: true },
        { name: '🏅 Badges Earned', value: earned.length.toString(), inline: true },
        { name: '🎖️ Your Badges', value: earned.length ? earned.join('\n') : '🔒 No badges yet — earn 50+ points!' },
        { name: '🎯 Next Reward', value: next ? `${next.badge} at **${next.min}** pts (need ${next.min - pts} more)` : '👑 All rewards unlocked!' }
      )
      
      ;
    await interaction.editReply({ embeds: [embed] });
  }
};
