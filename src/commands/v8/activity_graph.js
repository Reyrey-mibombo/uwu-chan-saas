const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { Activity } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_graph')
    .setDescription('Visual activity graph for the last 14 days'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const guildId = interaction.guildId;
    const start = new Date(Date.now() - 14 * 86400000);
    const acts = await Activity.find({ guildId, createdAt: { $gte: start } }).lean();

    const daily = {};
    acts.forEach(a => { const k = new Date(a.createdAt).toISOString().split('T')[0]; daily[k] = (daily[k] || 0) + 1; });
    const entries = Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0]));
    const max = Math.max(...entries.map(e => e[1]), 1);

    const graph = entries.map(([date, count]) => {
      const bar = '�'.repeat(Math.round((count / max) * 12)).padEnd(12, '�');
      const d = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${d}: ${bar} ${count}`;
    }).join('\n') || 'No activity data.';

    const embed = createEnterpriseEmbed()
      .setTitle('?? 14-Day Activity Graph')
      
      .setDescription(`\`\`\`${graph}\`\`\``)
      .addFields(
        { name: '?? Total Events', value: acts.length.toString(), inline: true },
        { name: '?? Peak Day', value: entries.find(e => e[1] === Math.max(...entries.map(e => e[1])))?.[0] || 'N/A', inline: true },
        { name: '?? Daily Avg', value: entries.length > 0 ? (acts.length / entries.length).toFixed(1) : '0', inline: true }
      )
      
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_activity_graph').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};







