const { SlashCommandBuilder } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/embeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('growth_forecast')
    .setDescription('Forecast server growth based on recent member activity'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const guild = await require('../../database/mongo').Guild.findOne({ guildId }).lean();

    const acts = await Activity.find({ guildId, createdAt: { $gte: thirtyDaysAgo } }).lean();
    const memberCount = interaction.guild.memberCount;
    const joined = guild?.stats?.membersJoined || 0;
    const dailyGrowth = joined > 0 ? (joined / 30).toFixed(1) : '0';
    const projectedMonthly = Math.round(parseFloat(dailyGrowth) * 30);

    const forecasts = [30, 60, 90].map(days => ({
      days,
      projected: Math.round(memberCount + parseFloat(dailyGrowth) * days)
    }));

    const embed = createEnterpriseEmbed()
      .setTitle('📈 Growth Forecast')
      
      .setThumbnail(interaction.guild.iconURL())
      .addFields(
        { name: '👥 Current Members', value: memberCount.toString(), inline: true },
        { name: '📈 Avg Daily Growth', value: dailyGrowth, inline: true },
        { name: '📅 Projected Monthly', value: projectedMonthly.toString(), inline: true },
        { name: '🔮 30-Day Projection', value: forecasts[0].projected.toString(), inline: true },
        { name: '🔮 60-Day Projection', value: forecasts[1].projected.toString(), inline: true },
        { name: '🔮 90-Day Projection', value: forecasts[2].projected.toString(), inline: true },
        { name: '⚡ Activity (30d)', value: acts.length.toString(), inline: true }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};



