const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('visual_rankings')
    .setDescription('Visual ranking system showing all staff tier positions'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const users = await User.find({}).lean();
    if (!users.length) return interaction.editReply('?? No staff data yet.');
    const RANK_ORDER = ['owner', 'admin', 'manager', 'senior', 'staff', 'trial', 'member'];
    const rankEmojis = { owner: '??', admin: '??', manager: '??', senior: '??', staff: '?', trial: '??', member: '??' };
    const rankGroups = {};
    users.forEach(u => {
      const r = u.staff?.rank || 'member';
      if (!rankGroups[r]) rankGroups[r] = [];
      rankGroups[r].push(u.username || 'Unknown');
    });
    const fields = RANK_ORDER.filter(r => rankGroups[r]?.length).map(r => ({
      name: `${rankEmojis[r] || '??'} ${r.toUpperCase()} � ${rankGroups[r].length} member(s)`,
      value: rankGroups[r].slice(0, 5).map(n => `� **${n}**`).join('\n') + (rankGroups[r].length > 5 ? `\n*+${rankGroups[r].length - 5} more*` : ''),
      inline: true
    }));
    const embed = createEnterpriseEmbed()
      .setTitle('??? Visual Rankings')
      
      .setThumbnail(interaction.guild.iconURL())
      .addFields(
        { name: '?? Total Staff', value: users.length.toString(), inline: true },
        { name: '??? Rank Tiers', value: fields.length.toString(), inline: true },
        ...fields
      )
      
      ;
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_visual_rankings').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};







