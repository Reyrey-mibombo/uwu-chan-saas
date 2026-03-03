const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recommendation_summary')
    .setDescription('View top staff recommendations based on performance'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }

    const users = await User.find({ 'staff.points': { $gt: 0 } }).lean();

    if (!users.length) {
      return interaction.editReply('?? No staff data found yet.');
    }

    const scored = users.map(u => ({
      username: u.username || 'Unknown',
      userId: u.userId,
      rank: u.staff?.rank || 'member',
      points: u.staff?.points || 0,
      consistency: u.staff?.consistency || 100,
      reputation: u.staff?.reputation || 0,
      score: (u.staff?.points || 0) * 0.5 + (u.staff?.consistency || 100) * 0.3 + (u.staff?.reputation || 0) * 0.2
    })).sort((a, b) => b.score - a.score);

    const top3 = scored.slice(0, 3);
    const medals = ['??', '??', '??'];

    const fields = top3.map((u, i) => ({
      name: `${medals[i]} ${u.username} (${u.rank})`,
      value: `Points: **${u.points}** | Consistency: **${u.consistency}%** | Rep: **${u.reputation}**\nScore: **${u.score.toFixed(1)}**`,
      inline: false
    }));

    if (fields.length === 0) fields.push({ name: 'No data', value: 'No staff recorded yet.', inline: false });

    const embed = createEnterpriseEmbed()
      .setTitle('? Staff Recommendation Summary')
      
      .setDescription('Top staff based on points, consistency, and reputation:')
      .addFields(fields)
      .addFields({
        name: '?? Selection Criteria',
        value: '� 50% Points weight\n� 30% Consistency weight\n� 20% Reputation weight'
      })
      
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_recommendation_summary').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};





