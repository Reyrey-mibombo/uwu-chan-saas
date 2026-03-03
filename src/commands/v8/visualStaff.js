const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('visual_staff')
    .setDescription('[Visual] Visual staff leaderboard'),

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
      return interaction.editReply('? No staff found.');
    }

    const maxPoints = users[0]?.staff?.points || 1;
    const medals = ['??', '??', '??'];

    const chart = users.map((u, i) => {
      const pts = u.staff?.points || 0;
      const bar = '�'.repeat(Math.round((pts / maxPoints) * 10)).padEnd(10, '�');
      const medal = medals[i] || `\`${i + 1}.\``;
      return `${medal} ${u.username || '?'}: ${bar} ${pts}`;
    }).join('\n');

    const embed = createEnterpriseEmbed()
      .setTitle('?? Visual Leaderboard')
      .setDescription(`\`\`\`${chart}\`\`\``)
      
      
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_visualStaff').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};







