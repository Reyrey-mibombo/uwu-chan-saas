const crypto = require('crypto');
const { License, Guild, User } = require('../database/mongo');
const logger = require('../utils/logger');

class LicenseSystem {
  constructor(client) {
    this.client = client;
    this.encryptionKey = process.env.LICENSE_ENCRYPTION_KEY;
  }

  async initialize() {
    logger.info('License System initialized');
  }

  generateLicenseKey() {
    const bytes = crypto.randomBytes(16);
    const key = bytes.toString('hex').toUpperCase();
    return `UWU-${key.slice(0, 4)}-${key.slice(4, 8)}-${key.slice(8, 12)}-${key.slice(12, 16)}`;
  }

  async createLicense(userId, tier, paymentInfo) {
    const key = this.generateLicenseKey();
    const license = new License({
      key,
      userId,
      tier,
      status: 'inactive',
      paymentId: paymentInfo.id,
      paymentProvider: paymentInfo.provider,
      metadata: paymentInfo.metadata
    });
    await license.save();
    return license;
  }

  async activateLicense(key, guildId, userId) {
    const license = await License.findOne({ key, status: 'inactive' });
    if (!license) {
      return { success: false, message: 'Invalid or already activated license key.' };
    }

    license.guildId = guildId;
    license.userId = userId;
    license.activatedAt = new Date();
    license.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    license.status = 'active';
    await license.save();

    await Guild.findOneAndUpdate(
      { guildId },
      {
        $set: {
          'premium.isActive': true,
          'premium.tier': license.tier,
          'premium.activatedAt': license.activatedAt,
          'premium.expiresAt': license.expiresAt,
          'premium.licenseKey': key
        }
      },
      { upsert: true }
    );

    await User.findOneAndUpdate(
      { userId },
      {
        $push: {
          licenses: {
            licenseKey: key,
            guildId,
            tier: license.tier,
            activatedAt: license.activatedAt,
            expiresAt: license.expiresAt,
            isActive: true
          }
        }
      },
      { upsert: true }
    );

    logger.info(`License ${key} activated for guild ${guildId} by user ${userId}`);
    return { success: true, license };
  }

  async validateLicense(guildId) {
    const guild = await Guild.findOne({ guildId });
    if (!guild || !guild.premium?.isActive) return { valid: false, tier: 'free' };
    
    if (guild.premium.expiresAt && new Date() > guild.premium.expiresAt) {
      await this.deactivateLicense(guild.premium.licenseKey);
      return { valid: false, tier: 'free', expired: true };
    }

    return { valid: true, tier: guild.premium.tier, expiresAt: guild.premium.expiresAt };
  }

  async deactivateLicense(key) {
    await License.findOneAndUpdate({ key }, { status: 'expired' });
    const guild = await Guild.findOne({ 'premium.licenseKey': key });
    if (guild) {
      guild.premium.isActive = false;
      guild.premium.tier = 'free';
      await guild.save();
    }
  }

  async syncLicenses() {
    const expiredLicenses = await License.find({
      status: 'active',
      expiresAt: { $lt: new Date() }
    });

    for (const license of expiredLicenses) {
      await this.deactivateLicense(license.key);
      logger.info(`Auto-deactivated expired license: ${license.key}`);
    }
  }

  async extendLicense(key, days) {
    const license = await License.findOne({ key });
    if (!license) return { success: false, message: 'License not found' };

    const newExpiry = license.expiresAt 
      ? new Date(license.expiresAt.getTime() + days * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    license.expiresAt = newExpiry;
    await license.save();

    await Guild.findOneAndUpdate(
      { 'premium.licenseKey': key },
      { $set: { 'premium.expiresAt': newExpiry } }
    );

    return { success: true, newExpiry };
  }
}

module.exports = LicenseSystem;
