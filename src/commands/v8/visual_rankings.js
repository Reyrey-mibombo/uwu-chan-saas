const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('visual_rankings')
    .setDescription('Visual ranking system showing all staff tier positions'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const users = await User.find({}).lean();
    if (!users.length) return interaction.editReply('📊 No staff data yet.');
    const RANK_ORDER = ['owner', 'admin', 'manager', 'senior', 'staff', 'trial', 'member'];
    const rankEmojis = { owner: '👑', admin: '💜', manager: '💎', senior: '🌟', staff: '⭐', trial: '🔰', member: '👤' };
    const rankGroups = {};
    users.forEach(u => {
      const r = u.staff?.rank || 'member';
      if (!rankGroups[r]) rankGroups[r] = [];
      rankGroups[r].push(u.username || 'Unknown');
    });
    const fields = RANK_ORDER.filter(r => rankGroups[r]?.length).map(r => ({
      name: `${rankEmojis[r] || '👤'} ${r.toUpperCase()} — ${rankGroups[r].length} member(s)`,
      value: rankGroups[r].slice(0, 5).map(n => `• **${n}**`).join('\n') + (rankGroups[r].length > 5 ? `\n*+${rankGroups[r].length - 5} more*` : ''),
      inline: true
    }));
    const embed = new EmbedBuilder()
      .setTitle('🎖️ Visual Rankings')
      .setColor(0x8e44ad)
      .setThumbnail(interaction.guild.iconURL())
      .addFields(
        { name: '👥 Total Staff', value: users.length.toString(), inline: true },
        { name: '🎖️ Rank Tiers', value: fields.length.toString(), inline: true },
        ...fields
      )
      .setFooter({ text: `${interaction.guild.name} • Staff Rankings` })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  }
};
