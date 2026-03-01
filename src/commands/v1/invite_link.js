const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCoolEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite_link')
    .setDescription('Get the server invite link'),
  
  async execute(interaction) {
    try {
      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.CreateInstantInvite)) {
        return interaction.reply({ embeds: [createErrorEmbed('I do not have permission to create invites in this server!')], ephemeral: true });
      }

      await interaction.deferReply();
      const invite = await interaction.channel.createInvite({ maxAge: 86400, maxUses: 100, unique: true });
      
      const embed = createCoolEmbed()
        .setTitle('🔗 Server Invite Link')
        .setDescription(`Here is your invite link: ${invite.url}\n\n*Note: This invite expires in 24 hours and is limited to 100 uses.*`);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [createErrorEmbed('An error occurred while generating the invite link.')] });
      } else {
        await interaction.reply({ embeds: [createErrorEmbed('An error occurred while generating the invite link.')], ephemeral: true });
      }
    }
  }
};
