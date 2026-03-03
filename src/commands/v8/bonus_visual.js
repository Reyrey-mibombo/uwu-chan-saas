const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bonus_visual')
    .setDescription('Visual breakdown of bonus points across all staff'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const users = await User.find({ 'staff.points': { $gt: 0 } }).sort({ 'staff.points': -1 }).limit(8).lean();
    if (!users.length) return interaction.editReply('?? No staff data found yet.');

    const maxPts = users[0]?.staff?.points || 1;
    const chart = users.map((u, i) => {
      const pts = u.staff?.points || 0;
      const bar = '�'.repeat(Math.round((pts / maxPts) * 10)).padEnd(10, '�');
      return `\`${String(i + 1).padStart(2)}\` ${bar} **${pts}** � ${u.username || '?'}`;
    }).join('\n');

    const totalPts = users.reduce((s, u) => s + (u.staff?.points || 0), 0);

    const embed = createEnterpriseEmbed()
      .setTitle('?? Bonus Points Visual')
      
      .setDescription(`\`\`\`${chart}\`\`\``)
      .addFields(
        { name: '? Total Points (Top 8)', value: totalPts.toString(), inline: true },
        { name: '?? Highest', value: (users[0]?.staff?.points || 0).toString(), inline: true },
        { name: '?? Average', value: (totalPts / users.length).toFixed(0), inline: true }
      )
      
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_bonus_visual').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};







