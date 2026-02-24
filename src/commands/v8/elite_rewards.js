const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('elite_rewards')
    .setDescription('View exclusive elite rewards for top-tier staff'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const target = interaction.user;
    const user = await User.findOne({ userId: target.id }).lean();
    const points = user?.staff?.points || 0;
    const rank = user?.staff?.rank || 'member';

    const rewards = [
      { threshold: 500, name: '🥇 Gold Status', perks: 'Gold role + priority support', icon: '🥇' },
      { threshold: 1000, name: '💎 Diamond Status', perks: 'Diamond role + custom title', icon: '💎' },
      { threshold: 2000, name: '👑 Legend Status', perks: 'Legend role + server recognition', icon: '👑' },
    ];

    const fields = rewards.map(r => ({
      name: `${points >= r.threshold ? '✅' : '🔒'} ${r.name} (${r.threshold} pts)`,
      value: `Perks: ${r.perks}${points >= r.threshold ? '\n✨ **UNLOCKED!**' : `\nNeed: **${Math.max(0, r.threshold - points)}** more points`}`,
      inline: false
    }));

    const embed = new EmbedBuilder()
      .setTitle('👑 Elite Rewards Program')
      .setColor(points >= 2000 ? 0xffd700 : points >= 1000 ? 0x00bfff : points >= 500 ? 0xf1c40f : 0x95a5a6)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '⭐ Your Points', value: points.toString(), inline: true },
        { name: '🎖️ Your Rank', value: rank.toUpperCase(), inline: true },
        ...fields
      )
      .setFooter({ text: `${interaction.guild.name} • Elite Rewards Program` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
