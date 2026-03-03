const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User, Activity } = require('../../database/mongo');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_upgrade')
    .setDescription('Upgrade a staff member\'s rank with celebration effect')
    .addUserOption(opt => opt.setName('user').setDescription('User to upgrade').setRequired(true))
    .addStringOption(opt => opt.setName('rank').setDescription('New rank').setRequired(true)
      .addChoices({ name: 'Staff', value: 'staff' }, { name: 'Senior', value: 'senior' }, { name: 'Manager', value: 'manager' }, { name: 'Admin', value: 'admin' })),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    if (!interaction.member.permissions.has('ManageRoles')) return interaction.editReply('? Need Manage Roles.');
    const target = interaction.options.getUser('user');
    const newRank = interaction.options.getString('rank');
    await User.findOneAndUpdate({ userId: target.id }, { $set: { 'staff.rank': newRank, username: target.username } }, { upsert: true });
    await Activity.create({ guildId: interaction.guildId, userId: target.id, type: 'promotion', data: { newRank, promotedBy: interaction.user.id } });
    const rankEmojis = { staff: '?', senior: '??', manager: '??', admin: '??' };
    const embed = createEnterpriseEmbed()
      .setTitle('?? RANK UPGRADE!')
      
      .setThumbnail(target.displayAvatarURL())
      .setDescription(`?? **${target.username}** has been upgraded to **${rankEmojis[newRank] || '?'} ${newRank.toUpperCase()}**! ??\n\n*Keep up the outstanding work!* ??`)
      .addFields(
        { name: '?? Staff', value: `<@${target.id}>`, inline: true },
        { name: '?? New Rank', value: `${rankEmojis[newRank] || ''} ${newRank.toUpperCase()}`, inline: true }
      )
      
      ;
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_rank_upgrade').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};







