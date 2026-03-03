const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed, createProgressBar } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_end')
    .setDescription('?? End your current work shift and collect your points'),

  async execute(interaction, client) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const staffSystem = client.systems.staff;
      const userId = interaction.user.id;
      const guildId = interaction.guildId;

      if (!staffSystem) {
        return interaction.editReply({ embeds: [createErrorEmbed('Staff system is currently offline.')] });
      }

      const result = await staffSystem.endShift(userId, guildId);

      if (!result.success) {
        return interaction.editReply({ embeds: [createErrorEmbed('You do not have an active shift to end!')] });
      }

      const hours = result.hours || 0;
      const minutes = result.minutes || 0;
      const totalSeconds = Math.round(result.duration || 0);
      const pointsEarned = result.pointsEarned || Math.floor(totalSeconds / 300); // 1pt per 5min

      // Build a shift quality score (0-100) based on duration
      const qualityScore = Math.min(100, Math.round((totalSeconds / 7200) * 100)); // max at 2h
      const qualityBar = createProgressBar(qualityScore);
      const qualityLabel = qualityScore >= 80 ? '?? Excellent' : qualityScore >= 50 ? '?? Good' : '?? Short';

      const embed = await createCustomEmbed(interaction, {
        title: '?? Shift Complete',
        description: `Great work, **${interaction.user.username}**! Your shift has been recorded and points awarded.`,
        thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
        fields: [
          { name: '?? Duration', value: `\`${hours}h ${minutes}m\` (\`${totalSeconds.toLocaleString()}s\`)`, inline: true },
          { name: '? Points Earned', value: `\`+${pointsEarned} pts\``, inline: true },
          { name: '?? Shift Quality', value: `\`${qualityBar}\` ${qualityLabel}`, inline: false },
          { name: '?? Ended At', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
        ],
        color: 'success',
        footer: 'uwu-chan • Keep up the great work!'
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[shift_end] Error:', error);
      const errEmbed = createErrorEmbed('An error occurred while ending your shift.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  },

  async handleButtonEndShift(interaction, client) {
    try {
      await interaction.deferUpdate();
      const staffSystem = client.systems.staff;
      if (!staffSystem) {
        return interaction.followUp({ content: '? Staff system is offline.', ephemeral: true });
      }

      const result = await staffSystem.endShift(interaction.user.id, interaction.guildId);
      if (!result.success) {
        return interaction.followUp({ content: '? You do not have an active shift to end.', ephemeral: true });
      }

      const totalSeconds = Math.round(result.duration || 0);
      const pointsEarned = result.pointsEarned || Math.floor(totalSeconds / 300);

      const embed = await createCustomEmbed(interaction, {
        title: '?? Shift Complete',
        description: `Shift ended via interactive button. Points awarded!`,
        fields: [
          { name: '?? Duration', value: `\`${result.hours || 0}h ${result.minutes || 0}m\``, inline: true },
          { name: '? Points Earned', value: `\`+${pointsEarned} pts\``, inline: true }
        ],
        color: 'success'
      });

      await interaction.editReply({ embeds: [embed], components: [] });
    } catch (error) {
      console.error('[shift_end] Button error:', error);
      await interaction.followUp({ content: '? An error occurred ending your shift.', ephemeral: true });
    }
  },

  async handleButtonPauseShift(interaction, client) {
    try {
      await interaction.deferUpdate();
      const staffSystem = client.systems.staff;
      if (!staffSystem) {
        return interaction.followUp({ content: '? Staff system is offline.', ephemeral: true });
      }

      const isResume = interaction.customId.startsWith('resume_shift_');
      const result = isResume
        ? await staffSystem.resumeShift(interaction.user.id, interaction.guildId)
        : await staffSystem.pauseShift(interaction.user.id, interaction.guildId);

      if (!result.success) {
        return interaction.followUp({ content: `? ${result.message}`, ephemeral: true });
      }

      const shiftId = interaction.customId.replace(isResume ? 'resume_shift_' : 'pause_shift_', '');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(isResume ? `pause_shift_${shiftId}` : `resume_shift_${shiftId}`)
          .setLabel(isResume ? '?? Pause' : '?? Resume')
          .setStyle(isResume ? ButtonStyle.Secondary : ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`end_shift_${shiftId}`)
          .setLabel('?? End Shift')
          .setStyle(ButtonStyle.Danger)
      );

      const newEmbed = await createCustomEmbed(interaction, {
        title: isResume ? '? Shift Resumed' : '?? Shift Paused',
        description: isResume ? 'Shift is now active again. Keep up the great work!' : 'Shift paused. Use Resume when ready.',
        fields: [{ name: '?? Status Changed', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }],
        color: isResume ? 'success' : 'warning'
      });

      await interaction.editReply({ embeds: [newEmbed], components: [row] });
    } catch (error) {
      console.error('[shift_end] Pause button error:', error);
      await interaction.followUp({ content: '? An error occurred.', ephemeral: true });
    }
  }
};

