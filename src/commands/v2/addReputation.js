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
        title: '✅ Reputation Signal Supercharged',
        description: `Successfully updated the reputation telemetry for **${targetUser.tag}** in the local sector.`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        fields: [
          { name: '👤 Personnel', value: `<@${targetUser.id}>`, inline: true },
          { name: '➕ Injected', value: `\`+${amount.toLocaleString()}\` **REP**`, inline: true },
          { name: '💫 Current Total', value: `**${user.staff.reputation.toLocaleString()}** **REP**`, inline: true }
        ],
        footer: `Authorized By Superior Command: ${interaction.user.tag}`,
        color: amount > 0 ? 'success' : 'error'
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
