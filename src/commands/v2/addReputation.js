const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add_reputation')
    .setDescription('[Premium] Add reputation points to a user')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to add').setRequired(true)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');

      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.editReply({ embeds: [createErrorEmbed('You do not have permission to manage reputation.')] });
      }

      // STRICT SCOPING: Only find user data connected to this specific guild
      let user = await User.findOne({ userId: targetUser.id, guildId: interaction.guildId });

      if (!user) {
        user = new User({ userId: targetUser.id, guildId: interaction.guildId, username: targetUser.tag });
      }

      if (!user.staff) user.staff = {};
      user.staff.reputation = (user.staff.reputation || 0) + amount;
      await user.save();

      const embed = await createCustomEmbed(interaction, {
        title: '✅ Reputation Supercharged',
        description: `Successfully injected reputation into **${targetUser.tag}**'s server profile.`,
        thumbnail: targetUser.displayAvatarURL(),
        fields: [
          { name: '👤 User', value: `<@${targetUser.id}>`, inline: true },
          { name: '➕ Added', value: `+${amount} Rep`, inline: true },
          { name: '💫 Total Reputation', value: `**${user.staff.reputation}** Rep`, inline: true }
        ],
        footer: `Authorized by ${interaction.user.tag}`
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Add Rep Error:', error);
      const errEmbed = createErrorEmbed('An error occurred while managing user reputation.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
