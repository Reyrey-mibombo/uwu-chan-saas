const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_alerts')
    .setDescription('Configure or view shift alerts')
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Action to perform')
        .setRequired(false)
        .addChoices(
          { name: 'View Active', value: 'active' },
          { name: 'View Alerts', value: 'alerts' }
        )),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const action = interaction.options.getString('action') || 'active';
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    if (action === 'active') {
      const activeShifts = await Shift.find({
        guildId,
        endTime: null
      });

      if (activeShifts.length === 0) {
        return interaction.reply({ 
          content: 'No active shifts at the moment.',
          ephemeral: true 
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('🔔 Active Shift Alerts')
        .setColor(0xf39c12)
        .setDescription(`${activeShifts.length} active shifts`);

      const activeList = activeShifts.map(shift => {
        const startTime = new Date(shift.startTime).toLocaleString();
        return `⏱️ <@${shift.userId}> started: ${startTime}`;
      });

      embed.addFields({ name: 'Currently On Shift', value: activeList.join('\n') });
      embed.setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    const shifts = await Shift.find({
      guildId,
      startTime: { $gte: dayAgo }
    })
      .sort({ startTime: -1 })
      .limit(15);

    if (shifts.length === 0) {
      return interaction.reply({ 
        content: 'No shift alerts in the past 24 hours.',
        ephemeral: true 
      });
    }

    const ongoing = shifts.filter(s => !s.endTime).length;
    const completed = shifts.filter(s => s.endTime).length;

    const embed = new EmbedBuilder()
      .setTitle('⚠️ Shift Alerts (24h)')
      .setColor(0x3498db)
      .addFields(
        { name: 'Ongoing', value: ongoing.toString(), inline: true },
        { name: 'Completed', value: completed.toString(), inline: true },
        { name: 'Total', value: shifts.length.toString(), inline: true }
      );

    const alertList = shifts.slice(0, 10).map(shift => {
      const time = new Date(shift.startTime).toLocaleString();
      const status = shift.endTime ? '✓ Completed' : '⏳ Ongoing';
      return `${status} - <@${shift.userId}> - ${time}`;
    });

    embed.addFields({ name: 'Recent Activity', value: alertList.join('\n') });
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
