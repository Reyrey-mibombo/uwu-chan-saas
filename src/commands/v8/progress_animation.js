const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_animation')
    .setDescription('View progress animation towards next rank')
    .addUserOption(opt => opt.setName('user').setDescription('User to view (optional)')),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guild.id;

    const user = await User.findOne({ userId: targetUser.id });

    const points = user?.staff?.points || 0;
    const rank = user?.staff?.rank || 'member';
    const consistency = user?.staff?.consistency || 100;

    const rankThresholds = {
      member: 100,
      trial: 300,
      staff: 600,
      senior: 1000,
      lead: 2000,
      admin: 5000
    };

    const currentThreshold = rankThresholds[rank] || 0;
    const nextRank = Object.keys(rankThresholds).find(r => rankThresholds[r] > points) || 'max';
    const nextThreshold = rankThresholds[nextRank] || currentThreshold;
    const progress = currentThreshold > 0 ? Math.min((points / nextThreshold) * 100, 100) : 0;

    const barLength = 15;
    const filled = Math.round((progress / 100) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

    const animation = [];
    for (let i = 0; i <= 10; i++) {
      const p = i * 10;
      const f = Math.round((p / 100) * barLength);
      animation.push('█'.repeat(f) + '░'.repeat(barLength - f));
    }

    const embed = new EmbedBuilder()
      .setTitle('🎬 Progress Animation')
      .setColor(0x3498db)
      .setDescription(`**${targetUser.username}**'s rank progress`)
      .addFields(
        { name: 'Current Rank', value: rank.toUpperCase(), inline: true },
        { name: 'Points', value: `${points}`, inline: true },
        { name: 'Next Rank', value: nextRank.toUpperCase(), inline: true }
      )
      .addFields({ name: 'Progress', value: `${bar} ${progress.toFixed(1)}%`, inline: false })
      .addFields({ name: 'Consistency', value: `${consistency}%`, inline: true });

    if (nextRank !== 'max') {
      embed.setFooter({ text: `${nextThreshold - points} points until ${nextRank}` });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
