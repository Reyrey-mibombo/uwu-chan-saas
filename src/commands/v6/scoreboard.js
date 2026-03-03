const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scoreboard')
    .setDescription('View the top 10 staff leaderboard by points'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }

    const users = await User.find({ 'staff.points': { $gt: 0 } })
      .sort({ 'staff.points': -1 })
      .limit(10)
      .lean();

    if (!users.length) {
      return interaction.editReply('?? No staff with points found yet. Staff earn points by using bot commands.');
    }

    const medals = ['??', '??', '??'];
    const leaderboard = users.map((u, i) => {
      const medal = medals[i] || `\`${String(i + 1).padStart(2)}\``;
      const rankBadge = u.staff?.rank ? `[${u.staff.rank}]` : '';
      return `${medal} **${u.username || 'Unknown'}** ${rankBadge} � **${u.staff?.points || 0}** pts | ${u.staff?.consistency || 100}% consistency`;
    }).join('\n');

    const totalPoints = users.reduce((s, u) => s + (u.staff?.points || 0), 0);
    const topScore = users[0]?.staff?.points || 0;

    const embed = createEnterpriseEmbed()
      .setTitle('?? Staff Scoreboard')
      
      .setDescription(leaderboard)
      .addFields(
        { name: '? Top Score', value: topScore.toString(), inline: true },
        { name: '?? Total Points (Top 10)', value: totalPoints.toString(), inline: true },
        { name: '?? Staff on Board', value: users.length.toString(), inline: true }
      )
      
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_scoreboard').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};





