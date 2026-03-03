const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCoolEmbed, createErrorEmbed, createCustomEmbed } = require('../../utils/embeds');
const { Guild, Activity, Shift, Warning } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('monthly_summary')
    .setDescription('View monthly activity summary'),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guild = interaction.guild;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [activities, shifts, warnings, guildData] = await Promise.all([
        Activity.find({ guildId: guild.id, createdAt: { $gte: thirtyDaysAgo } }),
        Shift.find({ guildId: guild.id, createdAt: { $gte: thirtyDaysAgo } }),
        Warning.find({ guildId: guild.id, createdAt: { $gte: thirtyDaysAgo } }),
        Guild.findOne({ guildId: guild.id })
      ]);

      const activeStaff = new Set(shifts.map(s => s.userId)).size;
      const totalShiftHours = shifts.reduce((acc, s) => acc + (s.duration || 0), 0) / 3600;

      const embed = await createCustomEmbed(interaction, {
        title: `?? Operational Summary: ${guild.name}`,
        description: 'Comprehensive 30-day longitudinal analytics report for server staff operations.',
        thumbnail: guild.iconURL({ dynamic: true }),
        fields: [
          { name: '?? Active Personnel', value: `\`${activeStaff}\` members`, inline: true },
          { name: '?? Total Active Hours', value: `\`${Math.round(totalShiftHours)}h\``, inline: true },
          { name: '?? Total Incidents', value: `\`${warnings.length}\``, inline: true },
          { name: '?? Event Logs', value: `\`${activities.length}\``, inline: true },
          { name: '?? Member Count', value: `\`${guild.memberCount.toLocaleString()}\``, inline: true }
        ]
      });

      await const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_monthly_summary').setLabel('ðŸ„ Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while fetching the monthly summary.');
      if (interaction.deferred || interaction.replied) {
        await const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_monthly_summary').setLabel('ðŸ„ Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};

