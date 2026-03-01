const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Guild, Shift, Warning } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily_summary')
    .setDescription('Get daily activity summary report'),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guildData = await Guild.findOne({ guildId: interaction.guild.id });
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let activeStaff = 0;
      let totalMinutes = 0;
      let warningsToday = 0;

      const todayShifts = await Shift.find({ guildId: interaction.guild.id, startTime: { $gte: today } }).lean();
      const todayWarnings = await Warning.find({ guildId: interaction.guild.id, createdAt: { $gte: today } }).lean();

      if (todayShifts.length > 0) {
        const activeUserIds = new Set(todayShifts.map(s => s.userId));
        activeStaff = activeUserIds.size;
        totalMinutes = todayShifts.reduce((acc, s) => {
          const end = s.endTime ? new Date(s.endTime) : new Date();
          return acc + (end - new Date(s.startTime)) / 60000;
        }, 0);
      }

      warningsToday = todayWarnings.length;

      const embed = createCoolEmbed()
        .setTitle('📊 Daily Summary')
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .addFields(
          { name: '👥 Active Staff', value: `\`${activeStaff}\` members`, inline: true },
          { name: '⏱️ Total Shift Time', value: `\`${Math.round(totalMinutes / 60)}h ${Math.round(totalMinutes % 60)}m\``, inline: true },
          { name: '⚠️ Warnings Issued', value: `\`${warningsToday}\``, inline: true }
        )
        .setColor('info');

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while fetching the daily summary.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
