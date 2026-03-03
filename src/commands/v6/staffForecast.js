const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_forecast')
    .setDescription('[Enterprise] Forecast staff needs'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }

    const users = await User.find({ 'staff.points': { $gt: 0 } }).lean();
    const activeCount = users.length;
    const avgPoints = users.reduce((acc, u) => acc + (u.staff?.points || 0), 0) / (activeCount || 1);

    const forecast = [
      { rank: 'Staff', needed: Math.max(0, 5 - activeCount), status: activeCount >= 5 ? '?' : '?' },
      { rank: 'Senior', needed: Math.max(0, 3 - Math.floor(activeCount / 2)), status: activeCount >= 6 ? '?' : '??' },
      { rank: 'Manager', needed: Math.max(0, 2 - Math.floor(activeCount / 5)), status: activeCount >= 10 ? '?' : '??' }
    ];

    const list = forecast.map(f => `${f.status} **${f.rank}**: ${f.needed} more needed`).join('\n');

    const embed = createEnterpriseEmbed()
      .setTitle('?? Staff Forecast')
      .setDescription(list)
      .addFields(
        { name: '?? Active Staff', value: activeCount.toString(), inline: true },
        { name: '? Avg Points', value: Math.round(avgPoints).toString(), inline: true }
      )
      
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_staffForecast').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};





