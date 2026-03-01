const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_rank')
    .setDescription('View staff rank and progression')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(false)),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();
      const user = interaction.options.getUser('user') || interaction.user;
      const staffSystem = client.systems.staff;

      if (!staffSystem) {
        return interaction.editReply({ embeds: [createErrorEmbed('Staff system is currently offline.')] });
      }

      const points = await staffSystem.getPoints(user.id, interaction.guildId);
      const rank = await staffSystem.getRank(user.id, interaction.guildId);
      const requirements = await staffSystem.getPromotionRequirements(rank);

      const rankNames = { member: 'Newcomer', trial: 'Trial', staff: 'Staff', moderator: 'Moderator', admin: 'Admin', owner: 'Owner' };
      let displayRank = rankNames[rank] || rank;

      const embed = createCoolEmbed()
        .setTitle(`🏆 ${user.username}'s Rank`)
        .addFields(
          { name: '🎖️ Current Rank', value: `\`${displayRank.toUpperCase()}\``, inline: true },
          { name: '⭐ Points', value: `\`${points}\``, inline: true },
          { name: '⬆️ Next Rank Req.', value: requirements?.next ? `\`${requirements.next}\` pts` : 'Max Rank', inline: true }
        )
        .setThumbnail(user.displayAvatarURL())
        .setColor('info');

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while fetching the staff rank.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
