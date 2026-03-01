const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset_points')
    .setDescription('[Premium] Reset ALL staff points for the active server')
    .addBooleanOption(opt => opt.setName('confirm').setDescription('You must confirm this destructive action').setRequired(true)),

  async execute(interaction) {
    try {
      if (!interaction.member.permissions.has('Administrator')) {
        return interaction.reply({ content: '❌ Administrator permission is strictly required.', ephemeral: true });
      }

      const confirm = interaction.options.getBoolean('confirm');

      if (!confirm) {
        return interaction.reply({ content: '❌ Operation aborted. You must use `/reset_points confirm:True` to execute this.', ephemeral: true });
      }

      await interaction.deferReply();

      // STRICT SCOPING: Only reset users matching THIS guild
      const result = await User.updateMany(
        { guildId: interaction.guildId, 'staff.points': { $gt: 0 } },
        { $set: { 'staff.points': 0 } }
      );

      const embed = await createCustomEmbed(interaction, {
        title: '☢️ Economy Reset Initiated',
        description: `**SUCCESS:** The staff economy for **${interaction.guild.name}** has been wiped.`,
        fields: [
          { name: '📊 Profiles Affected', value: `\`${result.modifiedCount}\` Staff Records`, inline: true }
        ],
        footer: `Executed by ${interaction.user.tag}`
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Reset Points Error:', error);
      const errEmbed = createErrorEmbed('An error occurred while attempting to wipe server points.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
