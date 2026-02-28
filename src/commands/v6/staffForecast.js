const { SlashCommandBuilder } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_forecast')
    .setDescription('[Enterprise] Forecast staff needs'),

  async execute(interaction, client) {
    await interaction.deferReply();

    const users = await User.find({ 'staff.points': { $gt: 0 } }).lean();
    const activeCount = users.length;
    const avgPoints = users.reduce((acc, u) => acc + (u.staff?.points || 0), 0) / (activeCount || 1);

    const forecast = [
      { rank: 'Staff', needed: Math.max(0, 5 - activeCount), status: activeCount >= 5 ? '✅' : '❌' },
      { rank: 'Senior', needed: Math.max(0, 3 - Math.floor(activeCount / 2)), status: activeCount >= 6 ? '✅' : '⚠️' },
      { rank: 'Manager', needed: Math.max(0, 2 - Math.floor(activeCount / 5)), status: activeCount >= 10 ? '✅' : '⚠️' }
    ];

    const list = forecast.map(f => `${f.status} **${f.rank}**: ${f.needed} more needed`).join('\n');

    const embed = createEnterpriseEmbed()
      .setTitle('🔮 Staff Forecast')
      .setDescription(list)
      .addFields(
        { name: '📊 Active Staff', value: activeCount.toString(), inline: true },
        { name: '⭐ Avg Points', value: Math.round(avgPoints).toString(), inline: true }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};



