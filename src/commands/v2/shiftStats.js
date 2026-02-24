const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User, Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_stats')
    .setDescription('[Premium] View shift statistics for a user')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(false)),

  async execute(interaction, client) {
    const user = interaction.options.getUser('user') || interaction.user;
    const shifts = await Shift.find({ userId: user.id, guildId: interaction.guildId }).lean();

    if (!shifts.length) {
      return interaction.reply({ content: '❌ No shifts found.', ephemeral: true });
    }

    const totalShifts = shifts.length;
    const totalTime = shifts.reduce((acc, s) => acc + (s.duration || 0), 0);
    const hours = Math.floor(totalTime / 3600);
    const minutes = Math.floor((totalTime % 3600) / 60);

    const completedShifts = shifts.filter(s => s.endTime).length;
    const avgDuration = completedShifts > 0 ? Math.round(totalTime / completedShifts) : 0;

    const embed = new EmbedBuilder()
      .setTitle(`⏱️ Shift Stats - ${user.username}`)
      .setColor(0x5865f2)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: '📊 Total Shifts', value: totalShifts.toString(), inline: true },
        { name: '⏱️ Total Time', value: `${hours}h ${minutes}m`, inline: true },
        { name: '📈 Avg Duration', value: `${Math.floor(avgDuration/60)}m`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
