const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_stats')
    .setDescription('View shift statistics')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const shifts = await Shift.find({ userId: targetUser.id, guildId: interaction.guildId }).lean();

      if (shifts.length === 0) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_shiftStats').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary));
        return await interaction.editReply({ embeds: [createErrorEmbed('No shift history found for this user.')], components: [row] });
      }

      const totalShifts = shifts.length;
      const totalTime = shifts.reduce((acc, s) => acc + (s.duration || 0), 0);
      const hours = Math.floor(totalTime / 3600);
      const minutes = Math.floor((totalTime % 3600) / 60);

      const completedShifts = shifts.filter(s => s.endTime != null).length;
      const avgDuration = completedShifts > 0 ? Math.round(totalTime / completedShifts) : 0;

      const activeShifts = shifts.filter(s => s.endTime == null).length;

      const embed = await createCustomEmbed(interaction, {
        title: `⏱️ Shift Stats: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        description: `Shift statistics in **${interaction.guild.name}**`,
        fields: [
          { name: '📋 Total Shifts', value: `\`${totalShifts}\``, inline: true },
          { name: '⏱️ Total Time', value: `\`${hours}h ${minutes}m\``, inline: true },
          { name: '📊 Avg Duration', value: `\`${Math.floor(avgDuration / 60)}m\``, inline: true },
          { name: '✅ Completed', value: `\`${completedShifts}\``, inline: true },
          { name: '🔴 Active', value: `\`${activeShifts}\``, inline: true }
        ],
        color: 'primary'
      });

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_shiftStats').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary));
      await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Shift Stats Error:', error);
      const errEmbed = createErrorEmbed('Failed to load shift statistics.');
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_shiftStats').setLabel('🔄 Retry').setStyle(ButtonStyle.Secondary));
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};

