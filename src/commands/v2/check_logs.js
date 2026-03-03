const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Activity, Warning, Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_logs')
    .setDescription('Check staff activity logs')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member (Optional)').setRequired(false))
    .addIntegerOption(opt => opt.setName('days').setDescription('Number of days (default 7)').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user');
      const days = interaction.options.getInteger('days') || 7;

      const query = { guildId: interaction.guildId };
      if (targetUser) query.userId = targetUser.id;

      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      query.createdAt = { $gte: cutoff };

      const [activities, warnings, shifts] = await Promise.all([
        Activity.find(query).sort({ createdAt: -1 }).limit(20).lean(),
        Warning.find({ ...query, createdAt: { $gte: cutoff } }).lean(),
        Shift.find({ userId: targetUser?.id, guildId: interaction.guildId, startTime: { $gte: cutoff }, endTime: { $ne: null } }).lean()
      ]);

      const username = targetUser ? targetUser.username : 'Server';

      const embed = await createCustomEmbed(interaction, {
        title: `📋 Activity Logs: ${username}`,
        description: `Last **${days}** days in **${interaction.guild.name}**`,
        thumbnail: targetUser ? targetUser.displayAvatarURL({ dynamic: true }) : interaction.guild.iconURL({ dynamic: true }),
        fields: [
          { name: '📊 Activities', value: `\`${activities.length}\` events`, inline: true },
          { name: '⚠️ Warnings', value: `\`${warnings.length}\``, inline: true },
          { name: '⏱️ Shifts', value: `\`${shifts.length}\``, inline: true }
        ],
        color: 'primary'
      });

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_check_logs').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary));
      await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Check Logs Error:', error);
      const errEmbed = createErrorEmbed('Failed to load activity logs.');
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_check_logs').setLabel('🔄 Retry').setStyle(ButtonStyle.Secondary));
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};

