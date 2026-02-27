const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('elite_badges')
    .setDescription('View elite badges earned by top staff members'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const users = await User.find({ 'staff.points': { $gt: 499 } }).sort({ 'staff.points': -1 }).lean();

    const BADGE_TIERS = [
      { min: 2000, badge: '👑 Legend', color: 0xffd700 },
      { min: 1000, badge: '💎 Diamond', color: 0x00bfff },
      { min: 500, badge: '🥇 Gold', color: 0xf1c40f },
    ];

    const badgeHolders = users.map(u => {
      const pts = u.staff?.points || 0;
      const tier = BADGE_TIERS.find(t => pts >= t.min) || { badge: '⭐ Silver', color: 0xc0c0c0 };
      return { username: u.username || 'Unknown', pts, badge: tier.badge };
    });

    const list = badgeHolders.length
      ? badgeHolders.map(h => `${h.badge} **${h.username}** — ${h.pts} pts`).join('\n')
      : '🏅 No elite badge holders yet. Earn 500+ points to qualify!';

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('🏅 Elite Badge Holders')
      
      .setDescription(list)
      .addFields(
        { name: '👑 Legend (2000+ pts)', value: badgeHolders.filter(h => h.pts >= 2000).length.toString(), inline: true },
        { name: '💎 Diamond (1000+ pts)', value: badgeHolders.filter(h => h.pts >= 1000).length.toString(), inline: true },
        { name: '🥇 Gold (500+ pts)', value: badgeHolders.filter(h => h.pts >= 500).length.toString(), inline: true }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};
