const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_flow')
    .setDescription('View promotion flow and history')
    .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)'))
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of promotions to show (default 10)').setMinValue(1).setMaxValue(25)),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const limit = interaction.options.getInteger('limit') || 10;
    const guildId = interaction.guild.id;

    const query = { guildId, type: 'promotion' };
    if (targetUser) query.userId = targetUser.id;

    const promotions = await Activity.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    const embed = new EmbedBuilder()
      .setTitle('📈 Promotion Flow')
      .setColor(0x2ecc71);

    if (promotions.length === 0) {
      embed.setDescription('No promotion history found.');
    } else {
      const promoList = await Promise.all(promotions.map(async (p, index) => {
        const user = await interaction.client.users.fetch(p.userId).catch(() => null);
        const username = user?.username || 'Unknown';
        const oldRank = p.data?.oldRank || 'unknown';
        const newRank = p.data?.newRank || 'unknown';
        const date = new Date(p.createdAt).toLocaleDateString();
        return `${index + 1}. **${username}**: ${oldRank} → ${newRank} (${date})`;
      }));

      embed.setDescription(promoList.join('\n'));
      embed.setFooter({ text: `Showing ${promotions.length} promotions` });
    }

    if (targetUser) {
      embed.setTitle(`📈 Promotion Flow: ${targetUser.username}`);
    }

    await interaction.reply({ embeds: [embed] });
  }
};
