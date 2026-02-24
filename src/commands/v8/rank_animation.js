const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_animation')
    .setDescription('Show animated rank progression for a user')
    .addUserOption(opt => opt.setName('user').setDescription('User to view').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: target.id }).lean();
    const pts = user?.staff?.points || 0;
    const rank = user?.staff?.rank || 'trial';
    const RANK_ORDER = ['trial', 'staff', 'senior', 'manager', 'admin', 'owner'];
    const THRESHOLDS = { trial: 0, staff: 100, senior: 300, manager: 600, admin: 1000, owner: 2000 };
    const rankEmojis = { trial: '🔰', staff: '⭐', senior: '🌟', manager: '💎', admin: '👑', owner: '🏆' };
    const nextRank = RANK_ORDER[RANK_ORDER.indexOf(rank) + 1];
    const nextThresh = nextRank ? THRESHOLDS[nextRank] : null;
    const pct = nextThresh ? Math.min(100, Math.round((pts / nextThresh) * 100)) : 100;
    const bar = '▓'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
    const steps = RANK_ORDER.map(r => `${r === rank ? `**→ ${rankEmojis[r]} ${r.toUpperCase()}** ←` : `${rankEmojis[r]} ${r}`}`).join(' | ');
    const embed = new EmbedBuilder()
      .setTitle(`🎭 Rank Animation — ${target.username}`)
      .setColor(0xf1c40f)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '🎖️ Rank Path', value: steps },
        { name: '⭐ Points', value: pts.toString(), inline: true },
        { name: '⬆️ Next Rank', value: nextRank ? `${rankEmojis[nextRank]} ${nextRank}` : '👑 MAX', inline: true },
        { name: '📊 Progress', value: `\`${bar}\` **${pct}%**` }
      )
      .setFooter({ text: `${interaction.guild.name} • Rank Animation` })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  }
};
