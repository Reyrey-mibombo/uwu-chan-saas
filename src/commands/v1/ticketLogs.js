const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCoolEmbed, createErrorEmbed, createCustomEmbed } = require('../../utils/embeds');
const { Ticket } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketlogs')
    .setDescription('View all ticket logs with detailed embeds')
    .addStringOption(opt =>
      opt.setName('status')
        .setDescription('Filter by status')
        .setRequired(false)
        .addChoices(
          { name: 'Open/Pending', value: 'open' },
          { name: 'Claimed', value: 'claimed' },
          { name: 'Closed', value: 'closed' },
          { name: 'All', value: 'all' }
        )
    )
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Filter by type')
        .setRequired(false)
        .addChoices(
          { name: 'Report Staff', value: 'report_staff' },
          { name: 'Feedback', value: 'feedback' }
        )
    )
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of tickets to show').setRequired(false))
    .setDefaultMemberPermissions(8192n),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const statusFilter = interaction.options.getString('status') || 'all';
      const typeFilter = interaction.options.getString('type');
      const limit = Math.min(interaction.options.getInteger('limit') || 10, 20);

      const query = { guildId: interaction.guildId };
      if (statusFilter !== 'all') {
        query.status = statusFilter;
      }
      if (typeFilter) {
        query.category = typeFilter;
      }

      const tickets = await Ticket.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      if (!tickets.length) {
        return const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_ticketLogs').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('No tickets found matching your query.')], components: [row] });
      }

      const pendingTickets = tickets.filter(t => t.status === 'open');
      const claimedTickets = tickets.filter(t => t.status === 'claimed');
      const closedTickets = tickets.filter(t => t.status === 'closed');

      const embeds = [];

      const buildTicketEmbed = async (ticket, title, color) => {
        return await createCustomEmbed(interaction, {
          title: title,
          fields: [
            { name: '🎫 Ticket ID', value: `\`${ticket._id.toString().slice(-6).toUpperCase()}\``, inline: true },
            { name: '👤 Originator', value: `**${ticket.username || 'Unknown'}**`, inline: true }
          ],
          color: color
        });
      };

      for (const t of pendingTickets.slice(0, 3)) {
        const e = await buildTicketEmbed(t, t.category === 'report_staff' ? '🚨 Pending Staff Report' : '💡 Pending Feedback', 'warning');
        e.addFields({ name: '📊 Status', value: '⏳ **QUEUEING**', inline: true });
        if (t.category === 'report_staff') {
          e.addFields(
            { name: '👥 Target Personnel', value: `\`${t.staffName || 'N/A'}\``, inline: true },
            { name: '📝 violation Reason', value: t.reason ? t.reason.substring(0, 100) : 'N/A', inline: false }
          );
        } else {
          e.addFields({ name: '💡 Feedback Content', value: t.feedback ? t.feedback.substring(0, 500) : 'N/A', inline: false });
        }
        embeds.push(e);
      }

      for (const t of claimedTickets.slice(0, 3)) {
        const e = await buildTicketEmbed(t, t.category === 'report_staff' ? '👋 Intercepted Staff Report' : '👋 Intercepted Feedback', 'info');
        e.addFields({ name: '📊 Status', value: `👋 **Intercepted** by ${t.claimedByName || 'Executive'}`, inline: true });
        embeds.push(e);
      }

      for (const t of closedTickets.slice(0, 3)) {
        const e = await buildTicketEmbed(t, t.category === 'report_staff' ? '🔒 Archived Staff Report' : '🔒 Archived Feedback', 'dark');
        e.addFields({ name: '📊 Status', value: `🔒 **Archived** by ${t.closedByName || 'Executive'}`, inline: true });
        embeds.push(e);
      }

      const summaryEmbed = await createCustomEmbed(interaction, {
        title: '🎫 Ticket Operational Logs Index',
        description: `Retrieved last \`${tickets.length}\` relational records matching current query parameters.`,
        fields: [
          { name: '⏳ Queueing', value: `\`${pendingTickets.length}\` items`, inline: true },
          { name: '👋 Active', value: `\`${claimedTickets.length}\` items`, inline: true },
          { name: '🔒 Archived', value: `\`${closedTickets.length}\` items`, inline: true }
        ],
        color: 'info'
      });

      await interaction.editReply({ embeds: [summaryEmbed, ...embeds].slice(0, 10) });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while fetching ticket logs.');
      if (interaction.deferred || interaction.replied) {
        await const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_ticketLogs').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};

