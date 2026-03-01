const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User, Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reward_summary')
    .setDescription('Poll individual operator reward parameters locally indexing server configurations.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Target specific explicit operator profile')
        .setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const guildId = interaction.guildId;

      let user = await User.findOne({ userId: targetUser.id, guildId }).lean();
      if (!user || !user.staff) {
        return interaction.editReply({ embeds: [createErrorEmbed(`Unregistered Target\n <@${targetUser.id}> isn't mapped inside **${interaction.guild.name}** database clusters.`)] });
      }

      const staff = user.staff;
      const points = staff.points || 0;
      const reputation = staff.reputation || 0;
      const achievements = staff.achievements || [];

      // Dynamic Database Tier Polling instead of legacy Hardcoded Limits
      const guild = await Guild.findOne({ guildId }).lean();
      if (!guild || !guild.promotionRequirements) {
        return interaction.editReply({ embeds: [createErrorEmbed(`This server has no backend hierarchy thresholds setup. Admin must map limits via \`/promo_setup\`.`)] });
      }

      const rankHierarchy = Object.keys(guild.promotionRequirements);
      if (!rankHierarchy.includes('member')) rankHierarchy.unshift('member');

      // Find user's tier based on mapping against actual database limits
      let currentTier = rankHierarchy[0];
      let nextTier = null;
      let pointsToNext = 0;
      let nextTierPoints = 0;

      for (let i = 0; i < rankHierarchy.length; i++) {
        const r = rankHierarchy[i];
        const reqPoints = guild.promotionRequirements[r]?.points || 0;
        if (points >= reqPoints) {
          currentTier = r;
          if (i + 1 < rankHierarchy.length) {
            nextTier = rankHierarchy[i + 1];
            nextTierPoints = guild.promotionRequirements[nextTier]?.points || 0;
            pointsToNext = Math.max(0, nextTierPoints - points);
          } else {
            nextTier = null;
          }
        }
      }

      const progressStr = generateProgressBar(points, nextTierPoints);

      const embed = await createCustomEmbed(interaction, {
        title: `🎁 Point Metrics Strategy: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL(),
        description: `Aggregating hierarchy thresholds directly against dynamic logic initialized by **${interaction.guild.name}**.\n\n${progressStr}`,
        fields: [
          { name: '⭐ Lifetime Yield', value: `\`${points}\` Pts`, inline: true },
          { name: '🎖️ Target Tier', value: `\`${currentTier.toUpperCase()}\``, inline: true },
          { name: '📈 Promotion Vector', value: nextTier ? `\`${nextTier.toUpperCase()}\` ➔ (\`${pointsToNext} req\`)` : '`MAXIMUM`', inline: true },
          { name: '🌟 Server Reputation', value: `\`${reputation}\` Auth`, inline: true },
          { name: '🏆 Milestone Count', value: `\`${achievements.length}\` Nodes`, inline: true }
        ]
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Reward Summary Error:', error);
      const errEmbed = createErrorEmbed('A database tracking error occurred generating hierarchical yield states.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};

function generateProgressBar(points, nextTierPoints) {
  const total = 20;
  if (!nextTierPoints || nextTierPoints === 0) return `\`████████████████████\` **LOCKED**`;

  const progress = Math.min(total, Math.round((points / nextTierPoints) * total));
  let bar = '';
  for (let i = 0; i < total; i++) {
    bar += i < progress ? '█' : '░';
  }
  return `\`${bar}\` **${points} / ${nextTierPoints}**`;
}
