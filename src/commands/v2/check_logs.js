const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Activity, Warning, Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_logs')
    .setDescription('Check staff activity logs for this server')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member (Optional)').setRequired(false))
    .addIntegerOption(opt => opt.setName('days').setDescription('Number of days to search back').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user');
      const days = interaction.options.getInteger('days') || 7;

      // STRICT SCOPING
      const query = { guildId: interaction.guildId };
      if (targetUser) query.userId = targetUser.id;

      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      query.createdAt = { $gte: cutoff };

      const [activities, warnings, shifts] = await Promise.all([
        Activity.find(query).sort({ createdAt: -1 }).limit(20).lean(),
        Warning.find({ ...query, createdAt: { $gte: cutoff } }).lean(),
        Shift.find({ ...query, createdAt: { $gte: cutoff } }).lean()
      ]);

      const username = targetUser ? `<@${targetUser.id}>'s` : 'Server';

      const embed = await createCustomEmbed(interaction, {
        title: `📜 Activity Logs: Last ${days} Days`,
        description: `A snapshot of ${username} logged footprint in **${interaction.guild.name}**.`,
        thumbnail: targetUser ? targetUser.displayAvatarURL() : interaction.guild.iconURL(),
        fields: [
          { name: '📋 Total Activities', value: `\`${activities.length}\``, inline: true },
          { name: '⚠️ Disciplinary Warnings', value: `\`${warnings.length}\``, inline: true },
          { name: '🔄 Logged Shifts', value: `\`${shifts.length}\``, inline: true }
        ],
        footer: 'Data queried securely via MongoDB aggregations.'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Check Logs Error:', error);
      const errEmbed = createErrorEmbed('A database error occurred while querying the server transaction logs.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
