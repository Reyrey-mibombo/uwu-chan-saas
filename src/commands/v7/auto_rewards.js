const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const REWARD_TIERS = [
  { threshold: 50, label: '🥉 Bronze', reward: 'Bronze Role + 10 bonus points' },
  { threshold: 150, label: '🥈 Silver', reward: 'Silver Role + 25 bonus points' },
  { threshold: 300, label: '🥇 Gold', reward: 'Gold Role + 50 bonus points' },
  { threshold: 500, label: '💎 Diamond', reward: 'Diamond Role + special badge' },
  { threshold: 1000, label: '👑 Elite', reward: 'Elite Role + permanent recognition' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auto_rewards')
    .setDescription('View automatic reward tiers and your current progress')
    .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const { User } = require('../../database/mongo');
    const target = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: target.id }).lean();
    const points = user?.staff?.points || 0;

    const fields = REWARD_TIERS.map(tier => {
      const progress = Math.min(100, Math.round((points / tier.threshold) * 100));
      const bar = '▓'.repeat(Math.round(progress / 10)) + '░'.repeat(10 - Math.round(progress / 10));
      const status = points >= tier.threshold ? '✅ Unlocked' : `${progress}%`;
      return {
        name: `${points >= tier.threshold ? '✅' : '🔒'} ${tier.label} — ${tier.threshold} pts`,
        value: `Reward: ${tier.reward}\n\`${bar}\` ${status}`,
        inline: false
      };
    });

    const nextTier = REWARD_TIERS.find(t => points < t.threshold);
    const footer = nextTier
      ? `${interaction.guild.name} • Next reward at ${nextTier.threshold} pts (need ${nextTier.threshold - points} more)`
      : `${interaction.guild.name} • All rewards unlocked! 👑`;

    const embed = new EmbedBuilder()
      .setTitle(`🎁 Auto-Reward Tiers — ${target.username}`)
      .setColor(0xe74c3c)
      .setThumbnail(target.displayAvatarURL())
      .addFields({ name: '⭐ Current Points', value: points.toString(), inline: true })
      .addFields(fields)
      .setFooter({ text: footer })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
