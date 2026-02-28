const { SlashCommandBuilder } = require('discord.js');
const { createEnterpriseEmbed } = require('../../utils/embeds');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank_announce')
    .setDescription('Announce a staff rank promotion')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member to promote').setRequired(true))
    .addStringOption(opt =>
      opt.setName('new_rank')
        .setDescription('New rank to assign')
        .setRequired(true)
        .addChoices(
          { name: 'Trial', value: 'trial' },
          { name: 'Staff', value: 'staff' },
          { name: 'Senior', value: 'senior' },
          { name: 'Manager', value: 'manager' },
          { name: 'Admin', value: 'admin' }
        )),

  async execute(interaction, client) {
    await interaction.deferReply();

    if (!interaction.member.permissions.has('ManageRoles')) {
      return interaction.editReply('❌ You need **Manage Roles** permission to announce promotions.');
    }

    const target = interaction.options.getUser('user');
    const newRank = interaction.options.getString('new_rank');

    let user = await User.findOneAndUpdate(
      { userId: target.id },
      { $set: { 'staff.rank': newRank, username: target.username } },
      { new: true, upsert: true }
    );

    await Activity.create({
      guildId: interaction.guildId,
      userId: target.id,
      type: 'promotion',
      data: { newRank, promotedBy: interaction.user.id }
    });

    const rankEmojis = { trial: '🔰', staff: '⭐', senior: '🌟', manager: '💎', admin: '👑' };

    const embed = createEnterpriseEmbed()
      .setTitle('🎉 Rank Promotion Announcement!')
      
      .setThumbnail(target.displayAvatarURL())
      .setDescription(`Congratulations to <@${target.id}> on their promotion!`)
      .addFields(
        { name: '👤 Staff Member', value: `<@${target.id}>`, inline: true },
        { name: `${rankEmojis[newRank] || '⭐'} New Rank`, value: newRank.toUpperCase(), inline: true },
        { name: '👮 Promoted By', value: `<@${interaction.user.id}>`, inline: true }
      )
      
      ;

    await interaction.editReply({ embeds: [embed] });
  }
};



