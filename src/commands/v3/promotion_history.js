const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_history')
    .setDescription('View promotion history')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to view promotion history for')
        .setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const targetUser = interaction.options.getUser('user');

    const query = { guildId, type: 'promotion' };
    if (targetUser) query.userId = targetUser.id;

    const promotions = await Activity.find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const allUsers = await User.find({
      'guilds.guildId': guildId,
      'staff.rank': { $ne: 'member' }
    }).lean();

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('⬆️ Promotion History')
      
      .setDescription(targetUser ? `Promotions for ${targetUser.username}` : 'Server promotion history');

    const promotedUsers = [...new Set(promotions.map(p => p.userId))];
    embed.addFields(
      { name: 'Total Promotions', value: promotions.length.toString(), inline: true },
      { name: 'Promoted Users', value: promotedUsers.length.toString(), inline: true }
    );

    if (promotions.length > 0) {
      const promoList = await Promise.all(promotions.slice(0, 10).map(async promo => {
        const fromRank = promo.data?.fromRank || 'member';
        const toRank = promo.data?.toRank || 'member';
        const date = new Date(promo.createdAt).toLocaleDateString();
        
        let userName = 'Unknown';
        try {
          const user = await interaction.client.users.fetch(promo.userId);
          userName = user?.username || 'Unknown';
        } catch {}

        return `**${userName}**: ${fromRank} → ${toRank} (${date})`;
      }));
      embed.addFields({ name: 'Recent Promotions', value: promoList.join('\n'), inline: false });
    } else {
      embed.addFields({ name: 'Recent Promotions', value: 'No promotions found', inline: false });
    }

    const rankCounts = {};
    allUsers.forEach(u => {
      const rank = u.staff?.rank || 'member';
      rankCounts[rank] = (rankCounts[rank] || 0) + 1;
    });

    const rankSummary = Object.entries(rankCounts)
      .map(([rank, count]) => `${rank}: ${count}`)
      .join(', ');

    if (rankSummary) {
      embed.addFields({ name: 'Staff by Rank', value: rankSummary, inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
