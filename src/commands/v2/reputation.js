const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reputation')
    .setDescription('Check your reputation standing within this server')
    .addUserOption(opt => opt.setName('user').setDescription('User to check (Optional)').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;

      const user = await User.findOne({ userId: targetUser.id, guildId: interaction.guildId }).lean();

      const rep = user?.staff?.reputation || 0;
      const rank = user?.staff?.rank || 'member';

      const embed = await createCustomEmbed(interaction, {
        title: `💫 Reputation: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL(),
        description: `<@${targetUser.id}>'s reputation and standing inside **${interaction.guild.name}**.`,
        fields: [
          { name: '⭐ Reputation Points', value: `**${rep}**`, inline: true },
          { name: '🏆 Current Rank', value: `\`${rank.toUpperCase()}\``, inline: true }
        ]
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Reputation Error:', error);
      const errEmbed = createErrorEmbed('An error occurred while fetching reputation points.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
