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

      // Reputation Tiers for "Cool Feature"
      let tier = 'Neutral';
      if (rep >= 1000) tier = '🌌 Legendary';
      else if (rep >= 500) tier = '💎 Platinum';
      else if (rep >= 250) tier = '🥇 Gold';
      else if (rep >= 100) tier = '🥈 Silver';
      else if (rep >= 50) tier = '🥉 Bronze';

      const embed = await createCustomEmbed(interaction, {
        title: `💫 Personnel Reputation: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        description: `Official reputation standing for <@${targetUser.id}> in the **${interaction.guild.name}** network.`,
        fields: [
          { name: '⭐ Reputation Points', value: `**${rep.toLocaleString()}**`, inline: true },
          { name: '🏅 Reputation Tier', value: `\`${tier}\``, inline: true },
          { name: '🏆 Official Rank', value: `\`${rank.toUpperCase()}\``, inline: true }
        ],
        color: rep >= 100 ? 'enterprise' : 'primary'
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
