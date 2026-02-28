const { SlashCommandBuilder } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/embeds');
const { User, Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_summary')
    .setDescription('Full progress summary for a staff member')
    .addUserOption(opt => opt.setName('user').setDescription('User to view').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;
    const user = await User.findOne({ userId: target.id }).lean();
    const shifts = await Shift.find({ guildId, userId: target.id, endTime: { $ne: null } }).lean();
    const pts = user?.staff?.points || 0;
    const rank = user?.staff?.rank || 'member';
    const consistency = user?.staff?.consistency || 100;
    const shiftHrs = shifts.reduce((s, sh) => s + (sh.duration || (new Date(sh.endTime) - new Date(sh.startTime)) / 3600000), 0);
    const bar = (v, max, len = 10) => '▓'.repeat(Math.round(Math.min(v, max) / max * len)) + '░'.repeat(len - Math.round(Math.min(v, max) / max * len));
    const embed = createEnterpriseEmbed()
      .setTitle(`📋 Progress Summary — ${target.username}`)
      
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '🎖️ Rank', value: rank.toUpperCase(), inline: true },
        { name: '⭐ Points', value: pts.toString(), inline: true },
        { name: '🔄 Total Shifts', value: shifts.length.toString(), inline: true },
        { name: '⏱️ Total Shift Hours', value: shiftHrs.toFixed(1), inline: true },
        { name: '🏅 Achievements', value: (user?.staff?.achievements?.length || 0).toString(), inline: true },
        { name: '📊 Consistency', value: `\`${bar(consistency, 100)}\` ${consistency}%` },
        { name: '⭐ Points (vs 1000 max)', value: `\`${bar(pts, 1000)}\` ${pts}/1000` }
      )
      
      ;
    await interaction.editReply({ embeds: [embed] });
  }
};



