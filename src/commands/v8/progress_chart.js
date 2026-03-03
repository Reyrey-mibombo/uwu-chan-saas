const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_chart')
    .setDescription('Visual progress chart for all staff toward their next rank'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const THRESHOLDS = { trial: 0, staff: 100, senior: 300, manager: 600, admin: 1000, owner: 2000 };
    const RANK_ORDER = ['trial', 'staff', 'senior', 'manager', 'admin', 'owner'];
    const users = await User.find({ 'staff.points': { $gt: 0 } }).sort({ 'staff.points': -1 }).limit(8).lean();
    if (!users.length) return interaction.editReply('?? No staff data yet.');
    const lines = users.map(u => {
      const rank = u.staff?.rank || 'trial';
      const pts = u.staff?.points || 0;
      const nextRank = RANK_ORDER[RANK_ORDER.indexOf(rank) + 1];
      if (!nextRank) return `?? **${u.username || '?'}** � MAX`;
      const pct = Math.min(100, Math.round((pts / THRESHOLDS[nextRank]) * 100));
      const bar = '�'.repeat(Math.round(pct / 10)) + '�'.repeat(10 - Math.round(pct / 10));
      return `**${u.username || '?'}**: \`${bar}\` ${pct}% ? ${nextRank}`;
    }).join('\n');
    const embed = createEnterpriseEmbed()
      .setTitle('?? Staff Progress Chart')
      
      .setDescription(lines)
      
      ;
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_progress_chart').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};







