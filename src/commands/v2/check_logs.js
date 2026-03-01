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
        title: `📜 Operational Footprint: Last ${days} Days`,
        description: `### 🛡️ Transaction Log Snapshot\nRetrieved ${username} tactical footprint data from the **${interaction.guild.name}** operational ledger.`,
        thumbnail: targetUser ? targetUser.displayAvatarURL({ dynamic: true }) : interaction.guild.iconURL({ dynamic: true }),
        fields: [
          { name: '📋 Total Transactions', value: `\`${activities.length.toLocaleString()}\` Events`, inline: true },
          { name: '⚠️ Risk Indicators', value: `\`${warnings.length.toLocaleString()}\` Warnings`, inline: true },
          { name: '🔄 Service Patrols', value: `\`${shifts.length.toLocaleString()}\` Shifts`, inline: true }
        ],
        footer: 'Intelligence queried securely via high-performance MongoDB aggregations.',
        color: 'premium'
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
