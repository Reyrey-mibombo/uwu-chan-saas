const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_rank')
    .setDescription('View staff rank and progression')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),

  async execute(interaction, client) {
    const user = interaction.options.getUser('user') || interaction.user;
    const staffSystem = client.systems.staff;
    
    const points = await staffSystem.getPoints(user.id, interaction.guildId);
    const rank = await staffSystem.getRank(user.id, interaction.guildId);
    const requirements = await staffSystem.getPromotionRequirements(rank);
    
    const rankOrder = ['member', 'trial', 'staff', 'moderator', 'admin', 'owner'];
    const rankNames = { member: 'Newcomer', trial: 'Trial', staff: 'Staff', moderator: 'Moderator', admin: 'Admin', owner: 'Owner' };
    
    let displayRank = rankNames[rank] || rank;
    
    const embed = new EmbedBuilder()
      .setTitle(`🏆 ${user.username}'s Rank`)
      .addFields(
        { name: 'Rank', value: displayRank, inline: true },
        { name: 'Points', value: `${points}`, inline: true },
        { name: 'Next Rank', value: requirements.next, inline: true }
      )
      .setColor('#f1c40f')
      .setThumbnail(user.displayAvatarURL());

    await interaction.reply({ embeds: [embed] });
  }
};
