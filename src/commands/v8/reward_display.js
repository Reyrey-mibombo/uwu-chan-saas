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
      .setTitle(`🎁 Reward Display — ${target.username}`)
      .setColor(earned.length > 0 ? 0xf1c40f : 0x95a5a6)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '⭐ Points', value: pts.toString(), inline: true },
        { name: '🏅 Badges Earned', value: earned.length.toString(), inline: true },
        { name: '🎖️ Your Badges', value: earned.length ? earned.join('\n') : '🔒 No badges yet — earn 50+ points!' },
        { name: '🎯 Next Reward', value: next ? `${next.badge} at **${next.min}** pts (need ${next.min - pts} more)` : '👑 All rewards unlocked!' }
      )
      .setFooter({ text: `${interaction.guild.name} • Reward Display` })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  }
};
