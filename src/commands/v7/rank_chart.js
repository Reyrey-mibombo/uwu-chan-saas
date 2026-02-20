const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_chart')
    .setDescription('View a bar chart of staff rank distribution'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const users = await User.find({}).lean();
    if (!users.length) return interaction.editReply('📊 No staff data found yet.');

    const rankOrder = ['owner', 'admin', 'manager', 'senior', 'staff', 'trial', 'member'];
    const rankCounts = {};
    users.forEach(u => { const r = u.staff?.rank || 'member'; rankCounts[r] = (rankCounts[r] || 0) + 1; });

    const sorted = rankOrder.filter(r => rankCounts[r] > 0).map(r => [r, rankCounts[r]]);
    const max = Math.max(...sorted.map(([, c]) => c), 1);
    const rankEmojis = { owner: '👑', admin: '💜', manager: '💎', senior: '🌟', staff: '⭐', trial: '🔰', member: '👤' };

    const chart = sorted.map(([rank, count]) => {
      const bar = '█'.repeat(Math.round((count / max) * 12)) + '░'.repeat(12 - Math.round((count / max) * 12));
      return `${rankEmojis[rank] || '•'} ${rank.padEnd(8)}: ${bar} ${count}`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('📊 Staff Rank Distribution')
      .setColor(0x8e44ad)
      .setDescription(`\`\`\`${chart}\`\`\``)
      .addFields(
        { name: '👥 Total Staff', value: users.length.toString(), inline: true },
        { name: '🎖️ Unique Ranks', value: sorted.length.toString(), inline: true }
      )
      .setFooter({ text: `${interaction.guild.name} • Rank Chart` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
