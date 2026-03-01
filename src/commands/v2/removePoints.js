const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove_points')
    .setDescription('[Premium] Remove points from a user within this server')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to remove').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (!interaction.member.permissions.has('ModerateMembers') && !interaction.member.permissions.has('ManageGuild')) {
        return interaction.editReply({ embeds: [createErrorEmbed('You do not have permission to remove points.')] });
      }

      // STRICT SCOPING: Only find user data connected to this specific guild
      let user = await User.findOne({ userId: targetUser.id, guildId: interaction.guildId });

      if (!user) {
        return interaction.editReply({ embeds: [createErrorEmbed(`No staff record found for <@${targetUser.id}> in this server.`)] });
      }

      if (!user.staff) user.staff = { points: 0 };
      user.staff.points = Math.max(0, (user.staff.points || 0) - amount);
      await user.save();

      const embed = await createCustomEmbed(interaction, {
        title: '📉 Points Deducted',
        description: `Successfully removed points from **${targetUser.tag}**'s server profile.`,
        thumbnail: targetUser.displayAvatarURL(),
        fields: [
          { name: '👤 User', value: `<@${targetUser.id}>`, inline: true },
          { name: '➖ Deducted', value: `-${amount} Pts`, inline: true },
          { name: '📝 Reason', value: `*${reason}*`, inline: false }
        ],
        footer: `Authorized by ${interaction.user.tag}`
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Remove Points Error:', error);
      const errEmbed = createErrorEmbed('An error occurred while removing user points.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
