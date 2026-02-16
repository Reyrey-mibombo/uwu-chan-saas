const logger = require('../utils/logger');

class ModerationSystem {
  constructor(client) {
    this.client = client;
    this.cases = new Map();
    this.autoModSettings = new Map();
  }

  async initialize() {
    logger.info('Moderation System initialized');
  }

  async createCase(guildId, userId, action, reason, moderatorId) {
    const caseId = Date.now().toString(36);
    const key = `${guildId}-${caseId}`;
    
    this.cases.set(key, {
      caseId,
      guildId,
      userId,
      action,
      reason,
      moderatorId,
      timestamp: new Date(),
      status: 'active'
    });
    
    return { success: true, caseId };
  }

  async getCase(guildId, caseId) {
    return this.cases.get(`${guildId}-${caseId}`);
  }

  async getUserHistory(guildId, userId) {
    const history = [];
    for (const [key, caseData] of this.cases) {
      if (key.startsWith(guildId) && caseData.userId === userId) {
        history.push(caseData);
      }
    }
    return history.sort((a, b) => b.timestamp - a.timestamp);
  }

  async setAutoMod(guildId, settings) {
    this.autoModSettings.set(guildId, {
      ...settings,
      updatedAt: new Date()
    });
    return { success: true };
  }

  async checkAutoMod(guildId, message) {
    const settings = this.autoModSettings.get(guildId);
    if (!settings || !settings.enabled) return { triggered: false };

    if (settings.antiSpam && message.content.length > 1000) {
      return { triggered: true, action: 'warn', reason: 'Spam detected' };
    }

    return { triggered: false };
  }
}

module.exports = ModerationSystem;
