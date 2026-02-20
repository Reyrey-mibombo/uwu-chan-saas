const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite_link')
    .setDescription('Get the server invite link'),
  
  async execute(interaction) {
    const invite = await interaction.channel.createInvite({ maxAge: 86400, maxUses: 100 });
    await interaction.reply(`🔗 Invite: ${invite.url}`);
  }
};
