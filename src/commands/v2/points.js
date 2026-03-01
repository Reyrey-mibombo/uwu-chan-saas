const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('points')
    .setDescription('Check your current points balance within this server')
    .addUserOption(opt => opt.setName('user').setDescription('User to check (Optional)').setRequired(false)),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();
      const user = interaction.options.getUser('user') || interaction.user;
      const staffSystem = client.systems.staff;

      if (!staffSystem) {
        return interaction.editReply({ embeds: [createErrorEmbed('Staff system is offline.')] });
      }

      const userPoints = await staffSystem.getPoints(user.id, interaction.guildId);
      const rank = await staffSystem.getRank(user.id, interaction.guildId);

      const embed = await createCustomEmbed(interaction, {
        title: `💰 Points Balance: ${user.username}`,
        thumbnail: user.displayAvatarURL(),
        description: `Here is the current economic standing for <@${user.id}> in **${interaction.guild.name}**.`,
        fields: [
          { name: '⭐ Total Points', value: `\`${userPoints}\``, inline: true },
          { name: '🏆 Current Rank', value: `\`${rank.toUpperCase()}\``, inline: true }
        ]
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Points Command Error:', error);
      const errEmbed = createErrorEmbed('An error occurred while fetching points balance.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
