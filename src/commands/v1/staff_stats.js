const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_stats')
    .setDescription('View staff activity statistics')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('Staff member to check')
        .setRequired(false)),

  async execute(interaction, client) {
    const target = interaction.options.getUser('user') || interaction.user;
    const staffSystem = client.systems.staffSystem;
    
    const points = await staffSystem.getPoints(target.id, interaction.guildId);
    const warnings = await staffSystem.getWarnings(target.id, interaction.guildId);
    const shiftStatus = staffSystem.shifts.get(`${interaction.guildId}-${target.id}`);

    const embed = new EmbedBuilder()
      .setTitle(`📊 Staff Statistics: ${target.username}`)
      .setColor(0x3498db)
      .addFields(
        { name: 'Points', value: points.toString(), inline: true },
        { name: 'Warnings', value: warnings.length.toString(), inline: true },
        { name: 'Status', value: shiftStatus ? '🟢 On Shift' : '⚪ Off Duty', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
