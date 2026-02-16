const logger = require('../utils/logger');

class TicketSystem {
  constructor(client) {
    this.client = client;
    this.tickets = new Map();
  }

  async initialize() {
    logger.info('Ticket System initialized');
  }

  async createTicket(guildId, userId, category, description) {
    const ticketId = Date.now().toString(36);
    this.tickets.set(`${guildId}-${ticketId}`, {
      id: ticketId,
      guildId,
      userId,
      category,
      description,
      status: 'open',
      createdAt: new Date(),
      messages: []
    });
    return { success: true, ticketId };
  }

  async getTicket(guildId, ticketId) {
    return this.tickets.get(`${guildId}-${ticketId}`);
  }

  async closeTicket(guildId, ticketId, closerId, reason) {
    const ticket = this.tickets.get(`${guildId}-${ticketId}`);
    if (!ticket) return { success: false, message: 'Ticket not found' };

    ticket.status = 'closed';
    ticket.closedAt = new Date();
    ticket.closedBy = closerId;
    ticket.closeReason = reason;

    return { success: true };
  }

  async addMessage(guildId, ticketId, userId, message) {
    const ticket = this.tickets.get(`${guildId}-${ticketId}`);
    if (!ticket) return { success: false, message: 'Ticket not found' };

    ticket.messages.push({
      userId,
      message,
      timestamp: new Date()
    });

    return { success: true };
  }
}

module.exports = TicketSystem;
