const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { Warning } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear_warnings')
    .setDescription('Clear all warnings for a user')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)),

  async execute(interaction, client) {
    if (!interaction.member.permissions.has('ManageMessages')) {
      return interaction.editReply({ content: '? Permission denied!', ephemeral: true });
    }

    const user = interaction.options.getUser('user');
    const result = await Warning.deleteMany({ userId: user.id, guildId: interaction.guildId });

    const embed = createPremiumEmbed()
      .setTitle('? Warnings Cleared')
      .setDescription(`Cleared ${result.deletedCount} warnings for ${user.tag}`)
      
      ;

    await const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v4_clearWarnings').setLabel('ðŸ„ Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};




