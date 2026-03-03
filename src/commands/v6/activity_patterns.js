const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/enhancedEmbeds');
const { Activity } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_patterns')
    .setDescription('Analyze activity patterns over the last 30 days'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const guildId = interaction.guildId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const activities = await Activity.find({ guildId, createdAt: { $gte: thirtyDaysAgo } }).lean();

    if (!activities.length) {
      return interaction.editReply('?? No activity data found for the past 30 days.');
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayCounts = Array(7).fill(0);
    const typeCounts = { command: 0, message: 0, shift: 0, warning: 0, promotion: 0 };

    activities.forEach(a => {
      dayCounts[new Date(a.createdAt).getDay()]++;
      if (typeCounts[a.type] !== undefined) typeCounts[a.type]++;
    });

    const maxDay = Math.max(...dayCounts);
    const dayBars = dayNames.map((d, i) => {
      const bar = '�'.repeat(Math.round((dayCounts[i] / Math.max(maxDay, 1)) * 8)) + '�'.repeat(8 - Math.round((dayCounts[i] / Math.max(maxDay, 1)) * 8));
      return `${d}: ${bar} ${dayCounts[i]}`;
    }).join('\n');

    const weekdays = dayCounts.slice(1, 6).reduce((a, b) => a + b, 0);
    const weekends = dayCounts[0] + dayCounts[6];

    const embed = createEnterpriseEmbed()
      .setTitle('?? Activity Patterns � Last 30 Days')
      
      .addFields(
        { name: '?? Total Events', value: activities.length.toString(), inline: true },
        { name: '?? Weekday Activity', value: weekdays.toString(), inline: true },
        { name: '??? Weekend Activity', value: weekends.toString(), inline: true },
        { name: '? Commands', value: typeCounts.command.toString(), inline: true },
        { name: '?? Warnings', value: typeCounts.warning.toString(), inline: true },
        { name: '?? Promotions', value: typeCounts.promotion.toString(), inline: true },
        { name: '?? Weekly Pattern', value: `\`\`\`${dayBars}\`\`\`` }
      )
      
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_activity_patterns').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};





