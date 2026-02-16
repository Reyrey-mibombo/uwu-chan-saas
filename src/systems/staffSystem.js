const logger = require('../utils/logger');

class StaffSystem {
  constructor(client) {
    this.client = client;
    this.shifts = new Map();
    this.warnings = new Map();
    this.points = new Map();
  }

  async initialize() {
    logger.info('Staff System initialized');
  }

  async startShift(userId, guildId) {
    const key = `${guildId}-${userId}`;
    this.shifts.set(key, {
      startTime: Date.now(),
      guildId,
      userId
    });
    return { success: true, startTime: new Date() };
  }

  async endShift(userId, guildId) {
    const key = `${guildId}-${userId}`;
    const shift = this.shifts.get(key);
    if (!shift) return { success: false, message: 'No active shift found' };

    const duration = Date.now() - shift.startTime;
    this.shifts.delete(key);
    
    return { 
      success: true, 
      duration,
      hours: Math.floor(duration / 3600000),
      minutes: Math.floor((duration % 3600000) / 60000)
    };
  }

  async addWarning(userId, guildId, reason, moderatorId) {
    const key = `${guildId}-${userId}`;
    if (!this.warnings.has(key)) this.warnings.set(key, []);
    
    this.warnings.get(key).push({
      reason,
      moderatorId,
      timestamp: new Date(),
      id: Date.now().toString(36)
    });
    
    return { success: true, warningId: Date.now().toString(36) };
  }

  async getWarnings(userId, guildId) {
    const key = `${guildId}-${userId}`;
    return this.warnings.get(key) || [];
  }

  async addPoints(userId, guildId, points, reason) {
    const key = `${guildId}-${userId}`;
    const current = this.points.get(key) || 0;
    this.points.set(key, current + points);
    return { success: true, total: current + points };
  }

  async getPoints(userId, guildId) {
    const key = `${guildId}-${userId}`;
    return this.points.get(key) || 0;
  }

  async getLeaderboard(guildId, limit = 10) {
    const guildPoints = [];
    for (const [key, points] of this.points) {
      if (key.startsWith(guildId)) {
        const userId = key.split('-')[1];
        guildPoints.push({ userId, points });
      }
    }
    return guildPoints.sort((a, b) => b.points - a.points).slice(0, limit);
  }
}

module.exports = StaffSystem;
