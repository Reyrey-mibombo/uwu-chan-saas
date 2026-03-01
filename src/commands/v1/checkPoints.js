const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_points')
    .setDescription('Check your or another staff member\'s points')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member to check').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const userData = await User.findOne({ userId: targetUser.id });

      if (!userData || !userData.staff) {
        return interaction.editReply({ embeds: [createErrorEmbed(`No staff data found for ${targetUser.tag}.`)] });
      }

      const points = userData.staff.points || 0;
      const rank = userData.staff.rank || 'trial';
      const consistency = userData.staff.consistency || 100;

      const embed = createCoolEmbed()
        .setTitle(`💰 ${targetUser.username}'s Points Profile`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '⭐ Points', value: `\`${points}\``, inline: true },
          { name: '🎖️ Rank', value: `\`${rank.toUpperCase()}\``, inline: true },
          { name: '📈 Consistency', value: `\`${consistency}%\``, inline: true }
        )
        .setColor('info');

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while checking points.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
