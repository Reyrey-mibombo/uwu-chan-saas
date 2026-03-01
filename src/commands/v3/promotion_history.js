const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_history')
    .setDescription('Poll chronologically authenticated execution histories governing server ranks.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Filter logs resolving explicitly against a single operator')
        .setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guildId = interaction.guildId;
      const targetUser = interaction.options.getUser('user');

      const query = { guildId, type: 'promotion' };
      if (targetUser) query.userId = targetUser.id;

      const promotions = await Activity.find(query)
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      // Bind strictly
      const allUsers = await User.find({
        guildId,
        'staff.rank': { $exists: true, $ne: 'member' }
      }).lean();

      if (promotions.length === 0 && allUsers.length === 0) {
        if (targetUser) return interaction.editReply({ embeds: [createErrorEmbed(`No hierarchical footprints exist tracking <@${targetUser.id}>.`)] });
        return interaction.editReply({ embeds: [createErrorEmbed('No automated promotions or manual boundary modifications have deployed on this server.')] });
      }

      const embedPayload = {
        title: '⬆️ Network Hierarchy Ledgers',
        description: targetUser
          ? `Filtering footprint sequences explicitly mapped to <@${targetUser.id}> in **${interaction.guild.name}**.`
          : `Reviewing the top ${Math.min(20, promotions.length)} rank executions logged inside **${interaction.guild.name}**.`,
        thumbnail: targetUser ? targetUser.displayAvatarURL() : interaction.guild.iconURL({ dynamic: true }),
        fields: []
      };

      const promotedUsers = [...new Set(promotions.map(p => p.userId))];
      embedPayload.fields.push(
        { name: '🌐 Global Operations', value: `\`${promotions.length}\` Sequences`, inline: true },
        { name: '👥 Target Subjects', value: `\`${promotedUsers.length}\` Operators`, inline: true }
      );

      if (promotions.length > 0) {
        const promoList = await Promise.all(promotions.slice(0, 10).map(async promo => {
          const fromRank = promo.data?.fromRank || 'member';
          const toRank = promo.data?.toRank || 'undefined';
          const unixTime = Math.floor(new Date(promo.createdAt).getTime() / 1000);

          return `> **<@${promo.userId}>:** \`${fromRank.toUpperCase()}\` ➔ \`${toRank.toUpperCase()}\` (<t:${unixTime}:d>)`;
        }));

        embedPayload.fields.push({ name: '📝 Recent Trailing Matrix', value: promoList.join('\n'), inline: false });
      }

      const rankCounts = {};
      allUsers.forEach(u => {
        const rank = u.staff?.rank || 'member';
        rankCounts[rank] = (rankCounts[rank] || 0) + 1;
      });

      const rankSummary = Object.entries(rankCounts)
        .map(([rank, count]) => `\`${rank.toUpperCase()}: ${count}\``)
        .join(', ');

      if (rankSummary && !targetUser) {
        embedPayload.fields.push({ name: '📊 Cumulative Network Bounds', value: rankSummary, inline: false });
      }

      const embed = await createCustomEmbed(interaction, embedPayload);
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Promotion History Error:', error);
      const errEmbed = createErrorEmbed('A database tracking error occurred generating trailing propagation ranks.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
