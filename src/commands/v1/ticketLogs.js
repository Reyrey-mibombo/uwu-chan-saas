const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
    .setDefaultMemberPermissions('ManageMessages'),

  async execute(interaction, client) {
    await interaction.deferReply();
    
    const statusFilter = interaction.options.getString('status') || 'all';
    const typeFilter = interaction.options.getString('type');
    const limit = interaction.options.getInteger('limit') || 10;

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
      return interaction.editReply({ content: '📭 No tickets found.', ephemeral: true });
    }

    const pendingTickets = tickets.filter(t => t.status === 'open');
    const claimedTickets = tickets.filter(t => t.status === 'claimed');
    const closedTickets = tickets.filter(t => t.status === 'closed');

    const embeds = [];

    if (pendingTickets.length > 0) {
      for (const ticket of pendingTickets.slice(0, 5)) {
        const embed = new EmbedBuilder()
          .setTitle(ticket.category === 'report_staff' ? `📋 Staff Report` : `💬 Feedback`)
          .setColor(ticket.category === 'report_staff' ? 0xe74c3c : 0x2ecc71)
          .addFields(
            { name: '🎫 Ticket ID', value: `\`${ticket._id.toString().slice(-6).toUpperCase()}\``, inline: true },
            { name: '👤 Submitted By', value: ticket.username || 'Unknown', inline: true },
            { name: '📊 Status', value: '⏳ **Pending** - Not claimed yet', inline: true }
          )
          .setTimestamp();

        if (ticket.category === 'report_staff') {
          embed.addFields(
            { name: '👨‍💼 Staff Member', value: ticket.staffName || 'N/A', inline: true },
            { name: '📝 Reason', value: ticket.reason ? ticket.reason.substring(0, 100) : 'N/A', inline: true },
            { name: '📎 Evidence', value: ticket.evidence ? ticket.evidence.substring(0, 100) : 'None', inline: false }
          );
        } else {
          embed.addFields(
            { name: '💭 Feedback', value: ticket.feedback ? ticket.feedback.substring(0, 150) : 'N/A', inline: false }
          );
          if (ticket.imageUrl) {
            embed.setImage(ticket.imageUrl);
          }
        }

        embeds.push(embed);
      }
    }

    if (claimedTickets.length > 0) {
      for (const ticket of claimedTickets.slice(0, 5)) {
        const embed = new EmbedBuilder()
          .setTitle(ticket.category === 'report_staff' ? `📋 Staff Report (Claimed)` : `💬 Feedback (Claimed)`)
          .setColor(0xf39c12)
          .addFields(
            { name: '🎫 Ticket ID', value: `\`${ticket._id.toString().slice(-6).toUpperCase()}\``, inline: true },
            { name: '👤 Submitted By', value: ticket.username || 'Unknown', inline: true },
            { name: '📊 Status', value: `✅ Claimed by ${ticket.claimedByName || 'Staff'}`, inline: true }
          )
          .setTimestamp();

        if (ticket.category === 'report_staff') {
          embed.addFields(
            { name: '👨‍💼 Staff Member', value: ticket.staffName || 'N/A', inline: true },
            { name: '📝 Reason', value: ticket.reason ? ticket.reason.substring(0, 100) : 'N/A', inline: true },
            { name: '📎 Evidence', value: ticket.evidence ? ticket.evidence.substring(0, 100) : 'None', inline: false }
          );
        } else {
          embed.addFields(
            { name: '💭 Feedback', value: ticket.feedback ? ticket.feedback.substring(0, 150) : 'N/A', inline: false }
          );
        }

        embeds.push(embed);
      }
    }

    if (closedTickets.length > 0) {
      for (const ticket of closedTickets.slice(0, 5)) {
        const embed = new EmbedBuilder()
          .setTitle(ticket.category === 'report_staff' ? `📋 Staff Report (Closed)` : `💬 Feedback (Closed)`)
          .setColor(0x95a5a6)
          .addFields(
            { name: '🎫 Ticket ID', value: `\`${ticket._id.toString().slice(-6).toUpperCase()}\``, inline: true },
            { name: '👤 Submitted By', value: ticket.username || 'Unknown', inline: true },
            { name: '🔒 Closed By', value: ticket.closedByName || 'Staff', inline: true }
          )
          .setTimestamp();

        if (ticket.category === 'report_staff') {
          embed.addFields(
            { name: '👨‍💼 Staff Member', value: ticket.staffName || 'N/A', inline: true },
            { name: '📝 Reason', value: ticket.reason ? ticket.reason.substring(0, 100) : 'N/A', inline: false }
          );
        }

        embeds.push(embed);
      }
    }

    const summaryEmbed = new EmbedBuilder()
      .setTitle('📊 Ticket Summary')
      .setColor(0x5865f2)
      .addFields(
        { name: '⏳ Pending', value: `${pendingTickets.length}`, inline: true },
        { name: '✅ Claimed', value: `${claimedTickets.length}`, inline: true },
        { name: '🔒 Closed', value: `${closedTickets.length}`, inline: true }
      )
      .setFooter({ text: `Total: ${tickets.length} tickets • Use /ticketsetup to create new tickets` })
      .setTimestamp();

    await interaction.editReply({ embeds: [summaryEmbed, ...embeds].slice(0, 10) });
  }
};
