const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_notify')
    .setDescription('Check if any staff are ready for rank-up and should be notified'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const THRESHOLDS = { trial: 0, staff: 100, senior: 300, manager: 600, admin: 1000, owner: 2000 };
    const RANK_ORDER = ['trial', 'staff', 'senior', 'manager', 'admin', 'owner'];
    const users = await User.find({ 'staff.points': { $gte: 100 } }).lean();
    const ready = users.filter(u => {
      const rank = u.staff?.rank || 'trial';
      const pts = u.staff?.points || 0;
      const next = RANK_ORDER[RANK_ORDER.indexOf(rank) + 1];
      return next && pts >= THRESHOLDS[next];
    });
    const txt = ready.length
      ? ready.map(u => `🔔 **${u.username || '?'}** is ready to promote to **${RANK_ORDER[RANK_ORDER.indexOf(u.staff?.rank || 'trial') + 1]}**`).join('\n')
      : '✅ No staff are pending promotion right now.';
    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setFooter({ text: 'UwU Chan SaaS • Premium Experience' })
      .setTimestamp()
      .setTitle('🔔 Progress Notifications')
      
      .setDescription(txt)
      .addFields({ name: '✅ Ready for Promotion', value: ready.length.toString(), inline: true })
      
      ;
    await interaction.editReply({ embeds: [embed] });
  }
};
