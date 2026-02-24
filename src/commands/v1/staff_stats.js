const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_stats')
    .setDescription('View staff statistics')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),

  async execute(interaction, client) {
    const user = interaction.options.getUser('user') || interaction.user;
    const staffSystem = client.systems.staff;
    
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

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${user.username}'s Stats`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: '⭐ Points', value: `${points}`, inline: true },
        { name: '🏆 Rank', value: rank, inline: true },
        { name: '📈 Score', value: `${score}/100`, inline: true },
        { name: '⏱️ Total Time', value: `${hours}h ${minutes}m`, inline: true },
        { name: '⚠️ Warnings', value: `${warnings.total}`, inline: true },
        { name: '📅 Total Shifts', value: `${shifts.length}`, inline: true }
      )
      .setColor('#3498db')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
