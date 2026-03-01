const { SlashCommandBuilder } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('time_tracking')
    .setDescription('Track authentic time worked over variable cycles')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member (Optional)').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;

      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(new Date().setDate(now.getDate() - now.getDay()));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [daily, weekly, monthly] = await Promise.all([
        Shift.find({ userId: targetUser.id, guildId: interaction.guildId, createdAt: { $gte: startOfDay } }).lean(),
        Shift.find({ userId: targetUser.id, guildId: interaction.guildId, createdAt: { $gte: startOfWeek } }).lean(),
        Shift.find({ userId: targetUser.id, guildId: interaction.guildId, createdAt: { $gte: startOfMonth } }).lean()
      ]);

      const calcTime = (shifts) => {
        const secs = shifts.reduce((acc, s) => acc + (s.duration || 0), 0);
        const hours = Math.floor(secs / 3600);
        const mins = Math.floor((secs % 3600) / 60);
        return `\`${hours}h ${mins}m\``;
      };

      const embed = await createCustomEmbed(interaction, {
        title: `⏱️ Temporal Operational Matrix: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        description: `### 🛡️ Service Time Aggregation\nComprehensive analysis of authenticated patrol cycles for <@${targetUser.id}> within the **${interaction.guild.name}** sector.`,
        fields: [
          { name: '🌞 Diurnal (Today)', value: calcTime(daily), inline: true },
          { name: '📅 Weekly Cycle', value: calcTime(weekly), inline: true },
          { name: '🗓️ Mensal (Month)', value: calcTime(monthly), inline: true }
        ],
        footer: 'Metrics are derived from strictly validated service logs.',
        color: 'premium'
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Time Tracking Error:', error);
      const errEmbed = createErrorEmbed('A database error occurred while querying variable timeframes.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
