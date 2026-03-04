const { UserStats } = require('../models');
const { Guild } = require('../database/mongo');
const logger = require('../utils/logger');
const { EmbedBuilder } = require('discord.js');

class EconomySystem {
  constructor(client) {
    this.client = client;
    this.workCooldowns = new Map();
  }

  async initialize() {
    logger.info('[Economy] System initialized');
    return this;
  }

  async getBalance(guildId, userId) {
    const stats = await UserStats.findOne({ userId, guildId }).lean();
    if (!stats) return { wallet: 0, bank: 0 };
    
    return {
      wallet: stats.economy?.wallet || 0,
      bank: stats.economy?.bank || 0
    };
  }

  async addMoney(guildId, userId, amount, type = 'wallet', reason = '') {
    const updateField = type === 'bank' ? 'economy.bank' : 'economy.wallet';
    
    const stats = await UserStats.findOneAndUpdate(
      { userId, guildId },
      {
        $inc: {
          [updateField]: amount,
          'economy.totalEarned': amount
        },
        $set: { updatedAt: new Date() }
      },
      { new: true, upsert: true }
    );

    logger.info(`[Economy] Added ${amount} to ${userId} in ${guildId}: ${reason}`);
    
    return {
      wallet: stats.economy?.wallet || 0,
      bank: stats.economy?.bank || 0
    };
  }

  async removeMoney(guildId, userId, amount, type = 'wallet', reason = '') {
    const balance = await this.getBalance(guildId, userId);
    const currentBalance = type === 'bank' ? balance.bank : balance.wallet;
    
    if (currentBalance < amount) {
      throw new Error('Insufficient funds');
    }

    const updateField = type === 'bank' ? 'economy.bank' : 'economy.wallet';
    
    const stats = await UserStats.findOneAndUpdate(
      { userId, guildId },
      {
        $inc: {
          [updateField]: -amount,
          'economy.totalSpent': amount
        },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    );

    logger.info(`[Economy] Removed ${amount} from ${userId} in ${guildId}: ${reason}`);
    
    return {
      wallet: stats.economy?.wallet || 0,
      bank: stats.economy?.bank || 0
    };
  }

  async transfer(guildId, fromUserId, toUserId, amount) {
    const fromBalance = await this.getBalance(guildId, fromUserId);
    
    if (fromBalance.wallet < amount) {
      throw new Error('Insufficient funds in wallet');
    }

    await Promise.all([
      this.removeMoney(guildId, fromUserId, amount, 'wallet', `Transfer to ${toUserId}`),
      this.addMoney(guildId, toUserId, amount, 'wallet', `Transfer from ${fromUserId}`)
    ]);

    logger.info(`[Economy] Transferred ${amount} from ${fromUserId} to ${toUserId} in ${guildId}`);
    
    return true;
  }

  async deposit(guildId, userId, amount) {
    const balance = await this.getBalance(guildId, userId);
    
    if (amount === 'all') {
      amount = balance.wallet;
    }
    
    if (balance.wallet < amount) {
      throw new Error('Insufficient funds in wallet');
    }

    await UserStats.findOneAndUpdate(
      { userId, guildId },
      {
        $inc: {
          'economy.wallet': -amount,
          'economy.bank': amount
        }
      }
    );

    logger.info(`[Economy] ${userId} deposited ${amount} in ${guildId}`);
    
    return await this.getBalance(guildId, userId);
  }

  async withdraw(guildId, userId, amount) {
    const balance = await this.getBalance(guildId, userId);
    
    if (amount === 'all') {
      amount = balance.bank;
    }
    
    if (balance.bank < amount) {
      throw new Error('Insufficient funds in bank');
    }

    await UserStats.findOneAndUpdate(
      { userId, guildId },
      {
        $inc: {
          'economy.bank': -amount,
          'economy.wallet': amount
        }
      }
    );

    logger.info(`[Economy] ${userId} withdrew ${amount} in ${guildId}`);
    
    return await this.getBalance(guildId, userId);
  }

  async daily(guildId, userId) {
    const guildData = await Guild.findOne({ guildId }).lean();
    const config = guildData?.economy;
    
    if (!config?.enabled) {
      throw new Error('Economy system is not enabled');
    }

    const stats = await UserStats.findOne({ userId, guildId });
    
    if (stats?.economy?.lastDaily) {
      const lastDaily = new Date(stats.economy.lastDaily);
      const now = new Date();
      const hoursSince = (now - lastDaily) / (1000 * 60 * 60);
      
      if (hoursSince < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSince);
        throw new Error(`You can claim your daily in ${hoursRemaining} hours`);
      }
    }

    const amount = config.dailyAmount || 100;
    const streak = stats?.economy?.streak || 0;
    const streakBonus = Math.min(streak * 10, 100);
    const totalAmount = amount + streakBonus;

    await UserStats.findOneAndUpdate(
      { userId, guildId },
      {
        $inc: {
          'economy.wallet': totalAmount,
          'economy.streak': 1,
          'economy.totalEarned': totalAmount
        },
        $set: {
          'economy.lastDaily': new Date()
        }
      },
      { upsert: true }
    );

    logger.info(`[Economy] ${userId} claimed daily reward of ${totalAmount} in ${guildId}`);
    
    return {
      amount: totalAmount,
      baseAmount: amount,
      streakBonus,
      streak: streak + 1
    };
  }

  async work(guildId, userId) {
    const guildData = await Guild.findOne({ guildId }).lean();
    const config = guildData?.economy;
    
    if (!config?.enabled) {
      throw new Error('Economy system is not enabled');
    }

    const cooldownKey = `${guildId}-${userId}`;
    const lastWork = this.workCooldowns.get(cooldownKey);
    const now = Date.now();
    const cooldown = config.workCooldown || 3600000;

    if (lastWork && now - lastWork < cooldown) {
      const minutesRemaining = Math.ceil((cooldown - (now - lastWork)) / 60000);
      throw new Error(`You can work again in ${minutesRemaining} minutes`);
    }

    const min = config.workMin || 10;
    const max = config.workMax || 100;
    const amount = Math.floor(Math.random() * (max - min + 1)) + min;

    const jobs = [
      'Software Engineer',
      'Discord Moderator',
      'Community Manager',
      'Content Creator',
      'Server Administrator',
      'Game Developer',
      'Graphic Designer',
      'Musician',
      'Writer',
      'Consultant'
    ];

    const job = jobs[Math.floor(Math.random() * jobs.length)];

    await this.addMoney(guildId, userId, amount, 'wallet', `Worked as ${job}`);
    
    this.workCooldowns.set(cooldownKey, now);

    return {
      amount,
      job
    };
  }

  async getLeaderboard(guildId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const users = await UserStats.find({ guildId })
      .sort({ 'economy.wallet': -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return await Promise.all(users.map(async (u) => {
      const user = await this.client.users.fetch(u.userId).catch(() => null);
      return {
        userId: u.userId,
        username: user?.username || 'Unknown',
        avatar: user?.displayAvatarURL(),
        wallet: u.economy?.wallet || 0,
        bank: u.economy?.bank || 0,
        total: (u.economy?.wallet || 0) + (u.economy?.bank || 0)
      };
    }));
  }

  async rob(guildId, userId, targetId) {
    const guildData = await Guild.findOne({ guildId }).lean();
    const config = guildData?.economy;
    
    if (!config?.enabled) {
      throw new Error('Economy system is not enabled');
    }

    const targetBalance = await this.getBalance(guildId, targetId);
    
    if (targetBalance.wallet < 100) {
      throw new Error('This user doesn\'t have enough money to rob');
    }

    const robberBalance = await this.getBalance(guildId, userId);
    if (robberBalance.wallet < 50) {
      throw new Error('You need at least 50 to attempt a robbery');
    }

    const success = Math.random() > 0.5;
    
    if (success) {
      const amount = Math.floor(Math.random() * (targetBalance.wallet * 0.3)) + 50;
      await this.transfer(guildId, targetId, userId, amount);
      
      return {
        success: true,
        amount,
        message: `You successfully robbed ${amount} !`
      };
    } else {
      const fine = Math.floor(robberBalance.wallet * 0.1);
      await this.removeMoney(guildId, userId, fine, 'wallet', 'Failed robbery attempt');
      
      return {
        success: false,
        fine,
        message: `You got caught and paid a fine of ${fine} !`
      };
    }
  }

  async setBalance(guildId, userId, wallet, bank) {
    const update = {};
    if (wallet !== undefined) update['economy.wallet'] = wallet;
    if (bank !== undefined) update['economy.bank'] = bank;

    await UserStats.findOneAndUpdate(
      { userId, guildId },
      { $set: update },
      { upsert: true }
    );

    logger.info(`[Economy] Admin set balance for ${userId} in ${guildId}: wallet=${wallet}, bank=${bank}`);
    
    return await this.getBalance(guildId, userId);
  }

  async getGlobalWealth(guildId) {
    const result = await UserStats.aggregate([
      { $match: { guildId } },
      {
        $group: {
          _id: null,
          totalWallet: { $sum: '$economy.wallet' },
          totalBank: { $sum: '$economy.bank' },
          totalEarned: { $sum: '$economy.totalEarned' },
          totalSpent: { $sum: '$economy.totalSpent' }
        }
      }
    ]);

    return result[0] || {
      totalWallet: 0,
      totalBank: 0,
      totalEarned: 0,
      totalSpent: 0
    };
  }
}

module.exports = EconomySystem;
