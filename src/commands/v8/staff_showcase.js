const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_showcase')
    .setDescription('Showcase all active staff with their stats'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const users = await User.find({ 'staff.points': { $gt: 0 } }).sort({ 'staff.points': -1 }).limit(5).lean();
    if (!users.length) return interaction.editReply('📊 No staff data found yet.');
    const rankEmojis = { owner: '👑', admin: '💜', manager: '💎', senior: '🌟', staff: '⭐', trial: '🔰', member: '👤' };
    const fields = users.map(u => ({
      name: `${rankEmojis[u.staff?.rank] || '👤'} ${u.username || 'Unknown'} — ${u.staff?.rank || 'member'}`,
      value: `⭐ ${u.staff?.points || 0} pts | 📈 ${u.staff?.consistency || 100}% | 🏅 ${u.staff?.achievements?.length || 0} achievements`,
      inline: false
    }));
    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('👥 Staff Showcase')
      
      .setThumbnail(interaction.guild.iconURL())
      .addFields(fields)
      
      ;
    await interaction.editReply({ embeds: [embed] });
  }
};
