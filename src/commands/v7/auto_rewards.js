const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { User } = require('../../database/mongo');

const REWARD_TIERS = [
  { threshold: 50, label: '🥉 Bronze Vector', reward: 'Bronze Rank + 10 Merit' },
  { threshold: 150, label: '🥈 Silver Vector', reward: 'Silver Rank + 25 Merit' },
  { threshold: 300, label: '🥇 Gold Vector', reward: 'Gold Rank + 50 Merit' },
  { threshold: 500, label: '💎 Diamond Apex', reward: 'Diamond Rank + Elite Badge' },
  { threshold: 1000, label: '👑 Zenith Elite', reward: 'Platinum Rank + Permanent Legacy' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_rewards')
    .setDescription('Zenith Apex: Algorithmic Merit Distribution & Reward Tiers')
    .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Zenith License Guard
      const license = await validatePremiumLicense(interaction);
      if (!license.allowed) {
        return interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const target = interaction.options.getUser('user') || interaction.user;
      const user = await User.findOne({ userId: target.id, guildId: interaction.guildId }).lean();
      const points = user?.staff?.points || 0;

      const fields = REWARD_TIERS.map(tier => {
        const progress = Math.min(100, Math.round((points / tier.threshold) * 100));

        // Zenith Spectral Gauge
        const barLength = 10;
        const filled = '█'.repeat(Math.round((progress / 100) * barLength));
        const empty = '░'.repeat(barLength - filled.length);
        const bar = `\`[${filled}${empty}]\` **${progress}%**`;

        const status = points >= tier.threshold ? '✅ AUTHENTICATED' : bar;
        return {
          name: `${points >= tier.threshold ? '✅' : '🔒'} ${tier.label.toUpperCase()}`,
          value: `> Merit Target: \`${tier.threshold}\`\n> Output: ${status}\n> Reward: *${tier.reward}*`,
          inline: false
        };
      });

      const nextTier = REWARD_TIERS.find(t => points < t.threshold);
      const trajectory = nextTier
        ? `Trajectory locked: **${nextTier.threshold - points}** merit remaining for **${nextTier.label}**.`
        : 'All macroscopic reward vectors successfully authenticated. 👑';

      const embed = await createCustomEmbed(interaction, {
        title: `🎁 Zenith Apex: Merit Distribution Matrix`,
        thumbnail: target.displayAvatarURL({ dynamic: true }),
        description: `### 🏆 Algorithmic Merit Registry\nAuthenticated reward vectors for personnel **${target.username}**. Analyzing metabolic output against sector thresholds.\n\n**💎 ZENITH APEX EXCLUSIVE**`,
        fields: [
          { name: '⭐ Aggregate Merit', value: `\`${points.toLocaleString()}\``, inline: true },
          { name: '📈 Trajectory Status', value: trajectory, inline: false },
          ...fields
        ],
        footer: 'Merit Distribution Matrix • V7 Automation Apex Suite',
        color: 'premium'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Zenith Auto Rewards Error:', error);
      await interaction.editReply({ embeds: [createErrorEmbed('Automation failure: Unable to establish merit distribution registry.')] });
    }
  }
};
