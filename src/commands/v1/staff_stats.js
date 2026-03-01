const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_stats')
    .setDescription('View staff statistics')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();
      const user = interaction.options.getUser('user') || interaction.user;
      const staffSystem = client.systems.staff;

      if (!staffSystem) {
        return interaction.editReply({ embeds: [createErrorEmbed('Staff system is currently offline.')] });
      }

      const points = await staffSystem.getPoints(user.id, interaction.guildId);
      const warnings = await staffSystem.getUserWarnings(user.id, interaction.guildId);
      const rank = await staffSystem.getRank(user.id, interaction.guildId);
      const score = await staffSystem.calculateStaffScore(user.id, interaction.guildId);

      const shifts = await require('../../database/mongo').Shift.find({
        userId: user.id,
        guildId: interaction.guild.id
      });

      const totalShiftTime = shifts.reduce((acc, s) => acc + (s.duration || 0), 0);
      const hours = Math.floor(totalShiftTime / 3600);
      const minutes = Math.floor((totalShiftTime % 3600) / 60);

      const embed = createCoolEmbed()
        .setTitle(`📊 ${user.username}'s Statistics`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: '⭐ Points', value: `\`${points}\``, inline: true },
          { name: '🏆 Rank', value: `\`${rank.toUpperCase()}\``, inline: true },
          { name: '📈 Score', value: `\`${score || 0}/100\``, inline: true },
          { name: '⏱️ Total Shift Time', value: `\`${hours}h ${minutes}m\``, inline: true },
          { name: '⚠️ Warnings', value: `\`${warnings?.total || 0}\``, inline: true },
          { name: '📅 Total Shifts', value: `\`${shifts.length}\``, inline: true }
        )
        .setColor('info');

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while fetching staff statistics.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
