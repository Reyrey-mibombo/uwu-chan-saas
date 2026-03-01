const { SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed, createErrorEmbed } = require('../../utils/embeds');
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
        return interaction.editReply({ embeds: [createErrorEmbed('No tickets found matching your query.')] });
      }

      const pendingTickets = tickets.filter(t => t.status === 'open');
      const claimedTickets = tickets.filter(t => t.status === 'claimed');
      const closedTickets = tickets.filter(t => t.status === 'closed');

      const embeds = [];

      const buildTicketEmbed = (ticket, title, color) => {
        const e = createCoolEmbed()
          .setTitle(title)
          .addFields(
            { name: '🎫 Ticket ID', value: `\`${ticket._id.toString().slice(-6).toUpperCase()}\``, inline: true },
            { name: '👤 Submitted By', value: ticket.username || 'Unknown', inline: true }
          )
          .setColor(color);

        if (ticket.status === 'open') e.addFields({ name: '📊 Status', value: '⏳ **Pending**', inline: true });
        else if (ticket.status === 'claimed') e.addFields({ name: '📊 Status', value: `👋 Claimed by ${ticket.claimedByName || 'Staff'}`, inline: true });
        else if (ticket.status === 'closed') e.addFields({ name: '📊 Status', value: `🔒 Closed by ${ticket.closedByName || 'Staff'}`, inline: true });

        if (ticket.category === 'report_staff') {
          e.addFields(
            { name: '👥 Staff Member', value: ticket.staffName || 'N/A', inline: true },
            { name: '📝 Reason', value: ticket.reason ? ticket.reason.substring(0, 100) : 'N/A', inline: false },
            { name: '📎 Evidence', value: ticket.evidence ? ticket.evidence.substring(0, 500) : 'None', inline: false }
          );
        } else {
          e.addFields(
            { name: '💡 Feedback', value: ticket.feedback ? ticket.feedback.substring(0, 500) : 'N/A', inline: false }
          );
          if (ticket.imageUrl) {
            e.setImage(ticket.imageUrl);
          }
        }
        return e;
      };

      for (const t of pendingTickets.slice(0, 3)) embeds.push(buildTicketEmbed(t, t.category === 'report_staff' ? '🚨 Pending Staff Report' : '💡 Pending Feedback', 'warning'));
      for (const t of claimedTickets.slice(0, 3)) embeds.push(buildTicketEmbed(t, t.category === 'report_staff' ? '👋 Claimed Staff Report' : '👋 Claimed Feedback', 'primary'));
      for (const t of closedTickets.slice(0, 3)) embeds.push(buildTicketEmbed(t, t.category === 'report_staff' ? '🔒 Closed Staff Report' : '🔒 Closed Feedback', 'dark'));

      const summaryEmbed = createCoolEmbed()
        .setTitle('🎫 Ticket System Logs Summary')
        .setDescription(`Showing the most recent \`${tickets.length}\` results matching your filters.`)
        .addFields(
          { name: '⏳ Pending', value: `\`${pendingTickets.length}\``, inline: true },
          { name: '👋 Claimed', value: `\`${claimedTickets.length}\``, inline: true },
          { name: '🔒 Closed', value: `\`${closedTickets.length}\``, inline: true }
        )
        .setColor('info');

      await interaction.editReply({ embeds: [summaryEmbed, ...embeds].slice(0, 10) });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while fetching ticket logs.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errEmbed] });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
