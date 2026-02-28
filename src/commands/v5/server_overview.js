const { SlashCommandBuilder } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { Guild, User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server_overview')
    .setDescription('View server overview'),

  async execute(interaction) {
    const guild = interaction.guild;
    const guildId = guild.id;

    const guildDoc = await Guild.findOne({ guildId });
    const userCount = await User.countDocuments({ 'guilds.guildId': guildId });

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentActivity = await Activity.countDocuments({ guildId, createdAt: { $gte: weekAgo } });

    const embed = createPremiumEmbed()
      .setTitle(`📊 Server Overview: ${guild.name}`)
      
      .setThumbnail(guild.iconURL())
      .addFields(
        { name: 'Members', value: guild.memberCount.toString(), inline: true },
        { name: 'Tracked Users', value: userCount.toString(), inline: true },
        { name: 'Roles', value: guild.roles.cache.size.toString(), inline: true },
        { name: 'Channels', value: guild.channels.cache.size.toString(), inline: true },
        { name: 'Active (7d)', value: recentActivity.toString(), inline: true },
        { name: 'Premium', value: guildDoc?.premium?.isActive ? '✅ Active' : '❌ Inactive', inline: true }
      )
      .addFields(
        { name: 'Created', value: guild.createdAt.toLocaleDateString(), inline: true },
        { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true }
      )
      ;

    await interaction.reply({ embeds: [embed] });
  }
};



