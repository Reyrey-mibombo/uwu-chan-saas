const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User, Activity } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('season_summary')
    .setDescription('Summary of this season\'s performance and highlights'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const guildId = interaction.guildId;
    const now = new Date();
    const month = now.getMonth();
    const season = month < 3 ? '?? Winter' : month < 6 ? '?? Spring' : month < 9 ? '?? Summer' : '?? Autumn';
    const seasonStart = new Date(now.getFullYear(), month < 3 ? 0 : month < 6 ? 3 : month < 9 ? 6 : 9, 1);
    const [acts, users] = await Promise.all([
      Activity.find({ guildId, createdAt: { $gte: seasonStart } }).lean(),
      User.find({ 'staff.points': { $gt: 0 } }).sort({ 'staff.points': -1 }).limit(3).lean()
    ]);

    const promotions = acts.filter(a => a.type === 'promotion').length;
    const top = users.map((u, i) => `${['??', '??', '??'][i]} **${u.username || '?'}** � ${u.staff?.points || 0} pts`).join('\n');

    const embed = createEnterpriseEmbed()
      .setTitle(`${season} Season Summary � ${now.getFullYear()}`)
      
      .addFields(
        { name: '?? Season', value: season, inline: true },
        { name: '?? Season Events', value: acts.length.toString(), inline: true },
        { name: '?? Promotions', value: promotions.toString(), inline: true },
        { name: '?? Active Users', value: [...new Set(acts.map(a => a.userId))].length.toString(), inline: true },
        { name: '?? Season Top 3', value: top || 'No data yet.' }
      )
      
      ;
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_season_summary').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};







