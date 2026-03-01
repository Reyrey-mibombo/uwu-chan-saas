const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_stats')
    .setDescription('[Premium] View authentic shift statistics mapped within this server')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const shifts = await Shift.find({ userId: targetUser.id, guildId: interaction.guildId }).lean();

      if (shifts.length === 0) {
        return interaction.editReply({ embeds: [createErrorEmbed(`No shift history records exist for <@${targetUser.id}> inside this server.`)] });
      }

      const totalShifts = shifts.length;
      const totalTime = shifts.reduce((acc, s) => acc + (s.duration || 0), 0);
      const hours = Math.floor(totalTime / 3600);
      const minutes = Math.floor((totalTime % 3600) / 60);

      const completedShifts = shifts.filter(s => s.endTime !== null && s.endTime !== undefined).length;
      const avgDuration = completedShifts > 0 ? Math.round(totalTime / completedShifts) : 0;

      const activeShifts = shifts.filter(s => s.endTime == null && s.status !== 'ended').length;

      const embed = await createCustomEmbed(interaction, {
        title: `⏱️ Patrol Analytics: ${targetUser.username}`,
        description: `### 🛡️ Operational Record Breakdown\nA comprehensive statistical analysis of all service patrols recorded for <@${targetUser.id}> within the **${interaction.guild.name}** sector.`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        fields: [
          { name: '📊 Patrols Executed', value: `\`${totalShifts.toLocaleString()}\` Logged`, inline: true },
          { name: '⏱️ Total Service Time', value: `\`${hours}h ${minutes}m\``, inline: true },
          { name: '📈 Avg. Deployment', value: `\`${Math.floor(avgDuration / 60)}m\``, inline: true },
          { name: '✅ Validated Records', value: `\`${completedShifts.toLocaleString()}\` Completed`, inline: true },
          { name: '🔴 Deployment Status', value: activeShifts > 0 ? '`ON ACTIVE PATROL`' : '`Standby`', inline: true }
        ],
        footer: 'Statistics are localized to the current server environment.',
        color: 'premium'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Shift Stats Error:', error);
      const errEmbed = createErrorEmbed('An error occurred while attempting to aggregate shift metrics.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
