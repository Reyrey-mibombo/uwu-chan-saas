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

  // ═══════════════════════════════════════════════════════════
  // ADMIN PANEL METHODS
  // ═══════════════════════════════════════════════════════════

  async getLicenseStats() {
    const [
      totalLicenses,
      activeLicenses,
      expiredLicenses,
      tierDistribution,
      recentActivations
    ] = await Promise.all([
      License.countDocuments(),
      License.countDocuments({ status: 'active' }),
      License.countDocuments({ status: 'expired' }),
      License.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$tier', count: { $sum: 1 } } }
      ]),
      License.find({ status: 'active' })
        .sort({ activatedAt: -1 })
        .limit(10)
        .select('key tier guildId userId activatedAt expiresAt')
        .lean()
    ]);

    return {
      overview: {
        total: totalLicenses,
        active: activeLicenses,
        expired: expiredLicenses,
        conversionRate: totalLicenses > 0 ? ((activeLicenses / totalLicenses) * 100).toFixed(2) : 0
      },
      tierDistribution: tierDistribution.reduce((acc, t) => {
        acc[t._id] = t.count;
        return acc;
      }, {}),
      recentActivations
    };
  }

  async revokeLicense(key, reason = 'Admin revocation') {
    const license = await License.findOneAndUpdate(
      { key },
      { status: 'revoked', 'metadata.revocationReason': reason, 'metadata.revokedAt': new Date() },
      { new: true }
    );

    if (!license) return { success: false, message: 'License not found' };

    if (license.guildId) {
      await Guild.findOneAndUpdate(
        { guildId: license.guildId },
        {
          $set: {
            'premium.isActive': false,
            'premium.tier': 'free',
            'premium.revokedAt': new Date(),
            'premium.revocationReason': reason
          }
        }
      );
    }

    logger.info(`License ${key} revoked. Reason: ${reason}`);
    return { success: true, license };
  }

  async bulkCreateLicenses(count, tier, adminId) {
    if (count > 100) return { success: false, message: 'Maximum 100 licenses at once' };

    const licenses = [];
    for (let i = 0; i < count; i++) {
      const key = this.generateLicenseKey();
      const license = new License({
        key,
        tier,
        status: 'inactive',
        metadata: { createdBy: adminId, bulkCreated: true, createdAt: new Date() }
      });
      await license.save();
      licenses.push(license);
    }

    logger.info(`Bulk created ${count} ${tier} licenses by admin ${adminId}`);
    return { success: true, licenses: licenses.map(l => l.key) };
  }

  async getLicenseDetails(key) {
    const license = await License.findOne({ key }).lean();
    if (!license) return null;

    const [guild, user] = await Promise.all([
      license.guildId ? Guild.findOne({ guildId: license.guildId }).select('name').lean() : null,
      license.userId ? User.findOne({ userId: license.userId }).select('username').lean() : null
    ]);

    return {
      ...license,
      guildName: guild?.name || null,
      username: user?.username || null
    };
  }

  async transferLicense(key, newGuildId, newUserId) {
    const license = await License.findOne({ key });
    if (!license) return { success: false, message: 'License not found' };

    const oldGuildId = license.guildId;

    // Deactivate from old guild
    if (oldGuildId) {
      await Guild.findOneAndUpdate(
        { guildId: oldGuildId },
        { $set: { 'premium.isActive': false, 'premium.tier': 'free' } }
      );
    }

    // Activate for new guild
    license.guildId = newGuildId;
    license.userId = newUserId;
    license.activatedAt = new Date();
    license.metadata = { ...license.metadata, transferredFrom: oldGuildId, transferredAt: new Date() };
    await license.save();

    await Guild.findOneAndUpdate(
      { guildId: newGuildId },
      {
        $set: {
          'premium.isActive': true,
          'premium.tier': license.tier,
          'premium.activatedAt': license.activatedAt,
          'premium.licenseKey': key
        }
      },
      { upsert: true }
    );

    logger.info(`License ${key} transferred from ${oldGuildId} to ${newGuildId}`);
    return { success: true, license };
  }
}

module.exports = LicenseSystem;
