const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('User to warn')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for warning')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const staffSystem = client.systems.staffSystem;

    const result = await staffSystem.addWarning(
      target.id, 
      interaction.guildId, 
      reason, 
      interaction.user.id
    );

    if (result.success) {
      const embed = new EmbedBuilder()
        .setTitle('⚠️ Warning Issued')
        .setColor(0xe74c3c)
        .addFields(
          { name: 'User', value: target.tag, inline: true },
          { name: 'Reason', value: reason, inline: true },
          { name: 'Warning ID', value: result.warningId, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      try {
        await target.send(`You have been warned in ${interaction.guild.name}: ${reason}`);
      } catch (e) {}
    }
  }
};
