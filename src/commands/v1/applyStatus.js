const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apply_status')
    .setDescription('Check your application status')
    .addStringOption(opt => opt.setName('application_id').setDescription('Application ID').setRequired(false)),

  async execute(interaction, client) {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const applicationId = interaction.options.getString('application_id');

    const user = await User.findOne({ userId });
    
    if (!user?.applications || user.applications.length === 0) {
      return interaction.reply({ content: '❌ You have no applications.', ephemeral: true });
    }

    const guildApps = user.applications.filter(a => a.guildId === guildId);

    if (!guildApps.length) {
      return interaction.reply({ content: '❌ You have no applications in this server.', ephemeral: true });
    }

    if (applicationId) {
      const app = guildApps.find(a => a.id === applicationId);
      if (!app) {
        return interaction.reply({ content: '❌ Application not found.', ephemeral: true });
      }

      const statusEmoji = app.status === 'pending' ? '⏳' : app.status === 'accepted' ? '✅' : '❌';
      const statusColor = app.status === 'pending' ? 0xf39c12 : app.status === 'accepted' ? 0x2ecc71 : 0xe74c3c;

      const embed = new EmbedBuilder()
        .setTitle(`📋 Application #${app.id}`)
        .setColor(statusColor)
        .addFields(
          { name: '📊 Status', value: `${statusEmoji} ${app.status.toUpperCase()}`, inline: true },
          { name: '📅 Applied', value: `<t:${Math.floor(new Date(app.createdAt).getTime()/1000)}:R>`, inline: true }
        )
        .setTimestamp();

      if (app.reviewedBy) {
        embed.addFields({ name: '👤 Reviewed By', value: app.reviewedBy, inline: true });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const latestApp = guildApps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    const statusEmoji = latestApp.status === 'pending' ? '⏳' : latestApp.status === 'accepted' ? '✅' : '❌';

    const embed = new EmbedBuilder()
      .setTitle('📋 Your Latest Application')
      .setColor(latestApp.status === 'pending' ? 0xf39c12 : latestApp.status === 'accepted' ? 0x2ecc71 : 0xe74c3c)
      .addFields(
        { name: '🎫 Application ID', value: latestApp.id, inline: true },
        { name: '📊 Status', value: `${statusEmoji} ${latestApp.status.toUpperCase()}`, inline: true },
        { name: '📅 Applied', value: `<t:${Math.floor(new Date(latestApp.createdAt).getTime()/1000)}:R>`, inline: true }
      );

    if (latestApp.reviewedBy) {
      embed.addFields({ name: '👤 Reviewed By', value: latestApp.reviewedBy, inline: true });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
