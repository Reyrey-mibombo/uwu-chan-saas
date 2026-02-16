const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  name: String,
  ownerId: String,
  premium: {
    isActive: { type: Boolean, default: false },
    tier: { type: String, enum: ['free', 'premium', 'enterprise'], default: 'free' },
    activatedAt: Date,
    expiresAt: Date,
    licenseKey: String,
    paymentProvider: String,
    subscriptionId: String
  },
  settings: {
    prefix: { type: String, default: '/' },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
    modules: {
      moderation: { type: Boolean, default: true },
      analytics: { type: Boolean, default: true },
      automation: { type: Boolean, default: false }
    }
  },
  stats: {
    commandsUsed: { type: Number, default: 0 },
    membersJoined: { type: Number, default: 0 },
    messagesProcessed: { type: Number, default: 0 },
    lastActivity: Date
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: String,
  globalName: String,
  licenses: [{
    licenseKey: String,
    guildId: String,
    tier: String,
    activatedAt: Date,
    expiresAt: Date,
    isActive: Boolean
  }],
  stats: {
    commandsUsed: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 }
  }
});

const licenseSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  userId: String,
  guildId: String,
  tier: { type: String, enum: ['premium', 'enterprise'], required: true },
  status: { type: String, enum: ['active', 'inactive', 'expired', 'revoked'], default: 'inactive' },
  createdAt: { type: Date, default: Date.now },
  activatedAt: Date,
  expiresAt: Date,
  paymentId: String,
  paymentProvider: String,
  metadata: mongoose.Schema.Types.Mixed
});

const Guild = mongoose.model('Guild', guildSchema);
const User = mongoose.model('User', userSchema);
const License = mongoose.model('License', licenseSchema);

module.exports = { Guild, User, License };
