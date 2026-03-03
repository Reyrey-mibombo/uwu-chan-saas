const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_notify')
    .setDescription('Check if any staff are ready for rank-up and should be notified'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const THRESHOLDS = { trial: 0, staff: 100, senior: 300, manager: 600, admin: 1000, owner: 2000 };
    const RANK_ORDER = ['trial', 'staff', 'senior', 'manager', 'admin', 'owner'];
    const users = await User.find({ 'staff.points': { $gte: 100 } }).lean();
    const ready = users.filter(u => {
      const rank = u.staff?.rank || 'trial';
      const pts = u.staff?.points || 0;
      const next = RANK_ORDER[RANK_ORDER.indexOf(rank) + 1];
      return next && pts >= THRESHOLDS[next];
    });
    const txt = ready.length
      ? ready.map(u => `?? **${u.username || '?'}** is ready to promote to **${RANK_ORDER[RANK_ORDER.indexOf(u.staff?.rank || 'trial') + 1]}**`).join('\n')
      : '? No staff are pending promotion right now.';
    const embed = createEnterpriseEmbed()
      .setTitle('?? Progress Notifications')
      
      .setDescription(txt)
      .addFields({ name: '? Ready for Promotion', value: ready.length.toString(), inline: true })
      
      ;
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_progress_notify').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};







