const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_status')
    .setDescription('Check current promotion status and requirements')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),

  async execute(interaction, client) {
    const user = interaction.options.getUser('user') || interaction.user;
    const staffSystem = client.systems.staff;
    
    const points = await staffSystem.getPoints(user.id, interaction.guildId);
    const rank = await staffSystem.getRank(user.id, interaction.guildId);
    const prediction = await staffSystem.predictPromotion(user.id, interaction.guildId);
    const requirements = await staffSystem.getPromotionRequirements(rank);
    
    const progress = Math.min((points / requirements.points) * 100, 100);
    const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
    
    const embed = new EmbedBuilder()
      .setTitle(`📈 ${user.username}'s Promotion Status`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: '💰 Points', value: `${points} / ${requirements.points}`, inline: true },
        { name: '🏆 Current Rank', value: rank, inline: true },
        { name: '📊 Progress', value: `\`${progressBar}\` ${Math.round(progress)}%`, inline: false },
        { name: '🎯 Next Rank', value: requirements.next, inline: true },
        { name: '⏱️ Est. Weeks', value: prediction ? `${prediction.estimatedWeeks}` : 'N/A', inline: true }
      )
      .setColor(progress >= 100 ? '#2ecc71' : '#3498db')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
