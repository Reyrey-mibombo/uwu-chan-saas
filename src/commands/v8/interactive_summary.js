const { SlashCommandBuilder } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/embeds');
const { User, Shift, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('interactive_summary')
    .setDescription('Interactive summary of your own server stats')
    .addUserOption(opt => opt.setName('user').setDescription('User to view').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guildId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [user, shifts, recentActs] = await Promise.all([
      User.findOne({ userId: target.id }).lean(),
      Shift.find({ guildId, userId: target.id, startTime: { $gte: thirtyDaysAgo } }).lean(),
      Activity.countDocuments({ guildId, userId: target.id, createdAt: { $gte: thirtyDaysAgo } })
    ]);

    const pts = user?.staff?.points || 0;
    const rank = user?.staff?.rank || 'member';
    const consistency = user?.staff?.consistency || 100;
    const completedShifts = shifts.filter(s => s.endTime).length;
    const totalShiftHrs = shifts.filter(s => s.endTime).reduce((sum, s) => sum + (s.duration || (new Date(s.endTime) - new Date(s.startTime)) / 3600000), 0);
    const consBar = '▓'.repeat(Math.round(consistency / 10)) + '░'.repeat(10 - Math.round(consistency / 10));

    const embed = createEnterpriseEmbed()
      .setTitle(`📱 Interactive Summary — ${target.username}`)
      
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '🎖️ Rank', value: rank.toUpperCase(), inline: true },
        { name: '⭐ Points', value: pts.toString(), inline: true },
        { name: '🏅 Achievements', value: (user?.staff?.achievements?.length || 0).toString(), inline: true },
        { name: '📊 Consistency', value: `\`${consBar}\` ${consistency}%` },
        { name: '🔄 Shifts (30d)', value: completedShifts.toString(), inline: true },
        { name: '⏱️ Shift Hours (30d)', value: totalShiftHrs.toFixed(1), inline: true },
        { name: '⚡ Actions (30d)', value: recentActs.toString(), inline: true }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};



