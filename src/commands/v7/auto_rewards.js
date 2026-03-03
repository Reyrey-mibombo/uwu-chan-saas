const { SlashCommandBuilder , ActionRowBuilder , ButtonBuilder , ButtonStyle } = require('discord.js');
const { createCustomEmbed, createEnterpriseEmbed, createErrorEmbed, createProgressBar, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User, Warning } = require('../../database/mongo');

const REWARD_TIERS = [
  { threshold: 50, id: 'bronze', label: '?? Bronze', reward: 'Bronze role + 10 bonus points', roleKey: 'bronzeRole' },
  { threshold: 150, id: 'silver', label: '?? Silver', reward: 'Silver role + 25 bonus points', roleKey: 'silverRole' },
  { threshold: 300, id: 'gold', label: '?? Gold', reward: 'Gold role + 50 bonus points', roleKey: 'goldRole' },
  { threshold: 500, id: 'diamond', label: '?? Diamond', reward: 'Diamond role + Elite Badge', roleKey: 'diamondRole' },
  { threshold: 1000, id: 'Enterprise', label: '?? Enterprise Elite', reward: 'Enterprise role + Permanent Legacy', roleKey: 'EnterpriseRole' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_rewards')
    .setDescription('?? View and claim merit-based reward tiers based on your actual points')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member to check').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const license = await validatePremiumLicense(interaction, 'enterprise');
      if (!license.allowed) {
        return await interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
      const target = interaction.options.getUser('user') || interaction.user;
      const user = await User.findOne({ userId: target.id, 'guilds.guildId': interaction.guildId }).lean();
      const points = user?.staff?.points || 0;

      const tierFields = REWARD_TIERS.map(tier => {
        const progress = Math.min(100, Math.round((points / tier.threshold) * 100));
        const bar = createProgressBar(progress, 12);
        const unlocked = points >= tier.threshold;
        const status = unlocked ? '? **UNLOCKED**' : `\`${bar}\` **${progress}%** (\`${points}/${tier.threshold} pts\`)`;
        return {
          name: `${unlocked ? '?' : '??'} ${tier.label}`,
          value: `> **Reward:** *${tier.reward}*\n> **Status:** ${status}`,
          inline: false
        };
      });

      const nextTier = REWARD_TIERS.find(t => points < t.threshold);
      const allUnlocked = !nextTier;
      const trajectory = allUnlocked
        ? '?? All reward tiers unlocked! Maximum merit achieved.'
        : `Next: **${nextTier.label}** � \`${nextTier.threshold - points}\` more points needed`;

      const embed = await createCustomEmbed(interaction, {
        title: `?? Merit Reward Tiers: ${target.username}`,
        thumbnail: target.displayAvatarURL({ dynamic: true }),
        description: `**Current Merit:** \`${points.toLocaleString()} points\`\n\n${trajectory}`,
        fields: [...tierFields],
        color: 'enterprise',
        footer: 'uwu-chan � Enterprise Auto-Rewards System'
      });

      // Add claim button if next tier is achievable
      const components = [];
      if (!allUnlocked) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`claim_reward_${target.id}`)
            .setLabel('?? Check Eligibility')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setLabel('?? Upgrade for More')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.gg/uwuchan')
        );
        components.push(row);
      }

      await interaction.editReply({ embeds: [embed], components });
    } catch (error) {
      console.error('[auto_rewards] Error:', error);
      const errEmbed = createErrorEmbed('Failed to load reward tiers.');
            if (interaction.deferred || interaction.replied) { return await interaction.editReply({ embeds: [errEmbed], components: [row] }); } else await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
    }
  }
};

