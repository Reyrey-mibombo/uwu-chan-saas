const { SlashCommandBuilder } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/embeds');
const { Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_animation')
    .setDescription('Animated-style progress display for your shift goals'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const shifts = await Shift.find({ guildId, userId: interaction.user.id, endTime: { $ne: null }, startTime: { $gte: thirtyDaysAgo } }).lean();
    const totalHrs = shifts.reduce((s, sh) => s + (sh.duration || (new Date(sh.endTime) - new Date(sh.startTime)) / 3600000), 0);
    const goal = 40;
    const pct = Math.min(100, Math.round((totalHrs / goal) * 100));
    const bar = '▓'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    const frame = frames[Math.floor(Date.now() / 100) % frames.length];
    const embed = createEnterpriseEmbed()
      .setTitle(`${frame} Progress Animation — ${interaction.user.username}`)
      
      .addFields(
        { name: '⏱️ Shift Hours (30d)', value: `${totalHrs.toFixed(1)}h / ${goal}h goal`, inline: true },
        { name: '✅ Shifts Completed', value: shifts.length.toString(), inline: true },
        { name: '📊 Monthly Goal Progress', value: `\`${bar}\` **${pct}%**` }
      )
      
      ;
    await interaction.editReply({ embeds: [embed] });
  }
};



