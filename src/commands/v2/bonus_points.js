const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bonus_points')
    .setDescription('Award bonus points to a staff member in this server')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount of points').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for bonus').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();
      const user = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'Excellent Performance Bonus';

      const staffSystem = client.systems.staff;
      if (!staffSystem) {
        return interaction.editReply({ embeds: [createErrorEmbed('Staff system is offline.')] });
      }

      // staffSystem handles strict GUILD queries internally, so we don't need manual DB touches here.
      const result = await staffSystem.addPoints(user.id, interaction.guildId, amount, reason);

      const embed = await createCustomEmbed(interaction, {
        title: '🎁 High-Performance Bonus Awarded',
        thumbnail: user.displayAvatarURL({ dynamic: true }),
        description: `Personnel recognition protocol complete for **${user.tag}**!`,
        fields: [
          { name: '👤 Recognized Personnel', value: `<@${user.id}>`, inline: true },
          { name: '📈 Bonus Injected', value: `\`+${amount.toLocaleString()}\` **PTS**`, inline: true },
          { name: '💰 Adjusted Balance', value: `\`${result.total.toLocaleString()}\` **PTS**`, inline: true },
          { name: '📝 Awarding Protocol', value: `*${reason}*`, inline: false }
        ],
        footer: `Authorization Signal: ${interaction.user.tag}`,
        color: 'enterprise'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Bonus Points Error:', error);
      const errEmbed = createErrorEmbed('An error occurred while awarding bonus points.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
