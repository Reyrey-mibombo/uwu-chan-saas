const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('time_tracking')
    .setDescription('Track time worked - daily, weekly, and monthly')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member (Optional)').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [daily, weekly, monthly] = await Promise.all([
        Shift.find({ userId: targetUser.id, guildId: interaction.guildId, startTime: { $gte: startOfDay }, endTime: { $ne: null } }).lean(),
        Shift.find({ userId: targetUser.id, guildId: interaction.guildId, startTime: { $gte: startOfWeek }, endTime: { $ne: null } }).lean(),
        Shift.find({ userId: targetUser.id, guildId: interaction.guildId, startTime: { $gte: startOfMonth }, endTime: { $ne: null } }).lean()
      ]);

      const calcTime = (shifts) => {
        const secs = shifts.reduce((acc, s) => acc + (s.duration || 0), 0);
        const hours = Math.floor(secs / 3600);
        const mins = Math.floor((secs % 3600) / 60);
        return `${hours}h ${mins}m`;
      };

      const embed = await createCustomEmbed(interaction, {
        title: `⏱️ Time Tracking: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        description: `Time worked in **${interaction.guild.name}**`,
        fields: [
          { name: '📅 Today', value: `\`${calcTime(daily)}\``, inline: true },
          { name: '📆 This Week', value: `\`${calcTime(weekly)}\``, inline: true },
          { name: '📆 This Month', value: `\`${calcTime(monthly)}\``, inline: true },
          { name: '📊 Summary', value: `Sessions: Today: \`${daily.length}\` | Week: \`${weekly.length}\` | Month: \`${monthly.length}\``, inline: false }
        ],
        color: 'primary'
      });

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_time_tracking').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary));
      await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Time Tracking Error:', error);
      const errEmbed = createErrorEmbed('Failed to load time tracking data.');
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_time_tracking').setLabel('🔄 Retry').setStyle(ButtonStyle.Secondary));
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};

