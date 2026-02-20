const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

const RANK_THRESHOLDS = { trial: 0, staff: 100, senior: 300, manager: 600, admin: 1000, owner: 2000 };
const RANK_ORDER = ['trial', 'staff', 'senior', 'manager', 'admin', 'owner'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_tracker')
    .setDescription('Track your progress toward the next rank')
    .addUserOption(opt => opt.setName('user').setDescription('User to track').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: target.id }).lean();

    if (!user) {
      return interaction.editReply(`📊 No data found for **${target.username}**. They need to use bot commands first.`);
    }

    const points = user.staff?.points || 0;
    const consistency = user.staff?.consistency || 100;
    const rank = user.staff?.rank || 'trial';
    const rankIdx = RANK_ORDER.indexOf(rank);
    const nextRank = RANK_ORDER[rankIdx + 1];

    if (!nextRank) {
      const embed = new EmbedBuilder()
        .setTitle(`👑 ${target.username} — Rank Progress`)
        .setColor(0xf1c40f)
        .setThumbnail(target.displayAvatarURL())
        .setDescription('🏆 **Maximum rank achieved!** You\'ve reached the top.')
        .addFields(
          { name: '🎖️ Current Rank', value: rank, inline: true },
          { name: '⭐ Points', value: points.toString(), inline: true }
        )
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }

    const currentThreshold = RANK_THRESHOLDS[rank] || 0;
    const nextThreshold = RANK_THRESHOLDS[nextRank];
    const progress = Math.min(100, Math.round(((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100));
    const needed = Math.max(0, nextThreshold - points);
    const bar = '▓'.repeat(Math.round(progress / 10)) + '░'.repeat(10 - Math.round(progress / 10));

    const embed = new EmbedBuilder()
      .setTitle(`📈 Rank Progress — ${target.username}`)
      .setColor(progress >= 80 ? 0x2ecc71 : progress >= 50 ? 0xf39c12 : 0xe74c3c)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '🎖️ Current Rank', value: rank, inline: true },
        { name: '⬆️ Next Rank', value: nextRank, inline: true },
        { name: '⭐ Points', value: `${points}/${nextThreshold}`, inline: true },
        { name: '📊 Progress', value: `\`${bar}\` **${progress}%**\nNeed **${needed}** more points` },
        { name: '📈 Consistency', value: `${consistency}%`, inline: true },
        { name: '🏅 Achievements', value: (user.staff?.achievements?.length || 0).toString(), inline: true }
      )
      .setFooter({ text: `${interaction.guild.name} • Rank Progress Tracker` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
