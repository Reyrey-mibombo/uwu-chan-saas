const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_score')
    .setDescription('View overall staff score')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),

  async execute(interaction, client) {
    const user = interaction.options.getUser('user') || interaction.user;
    const staffSystem = client.systems.staff;
    
    const score = await staffSystem.calculateStaffScore(user.id, interaction.guildId);
    const points = await staffSystem.getPoints(user.id, interaction.guildId);
    const consistency = await staffSystem.updateConsistency(user.id, interaction.guildId);
    const warnings = await staffSystem.getUserWarnings(user.id, interaction.guildId);
    
    const embed = new EmbedBuilder()
      .setTitle(`🎯 ${user.username}'s Staff Score`)
      .setDescription(`Overall Score: **${score}/100**`)
      .addFields(
        { name: 'Activity', value: `${Math.min(100, Math.round(points / 10))}`, inline: true },
        { name: 'Quality', value: `${Math.max(0, 100 - warnings.total * 5)}`, inline: true },
        { name: 'Consistency', value: `${consistency}`, inline: true }
      )
      .setColor(score >= 70 ? '#2ecc71' : '#e74c3c');

    await interaction.reply({ embeds: [embed] });
  }
};
