const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  name: String,
  ownerId: String,
  iconURL: String,
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
      automation: { type: Boolean, default: false },
      tickets: { type: Boolean, default: false }
    },
    autoRoles: [String],
    mutedRole: String,
    logChannel: String,
    welcomeChannel: String,
    modChannel: String
  },
  stats: {
    commandsUsed: { type: Number, default: 0 },
    membersJoined: { type: Number, default: 0 },
    messagesProcessed: { type: Number, default: 0 },
    warnings: { type: Number, default: 0 },
    lastActivity: Date
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: String,
  globalName: String,
  guilds: [{
    guildId: String,
    joinedAt: Date,
    roles: [String],
    nickname: String
  }],
  licenses: [{
    licenseKey: String,
    guildId: String,
    tier: String,
    activatedAt: Date,
    expiresAt: Date,
    isActive: Boolean
  }],
  staff: {
    rank: { type: String, default: 'member' },
    points: { type: Number, default: 0 },
    warnings: { type: Number, default: 0 },
    shiftTime: { type: Number, default: 0 },
    lastShift: Date,
    consistency: { type: Number, default: 100 },
    reputation: { type: Number, default: 0 },
    achievements: [String]
  },
  stats: {
    commandsUsed: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now }
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

const warningSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  moderatorId: String,
  reason: String,
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  points: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now }
});

const shiftSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  duration: Number,
  notes: String
});

const activitySchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  type: { type: String, enum: ['command', 'message', 'shift', 'warning', 'promotion'] },
  data: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

const ticketSchema = new mongoose.Schema({
  guildId: String,
  channelId: String,
  userId: String,
  category: String,
  status: { type: String, enum: ['open', 'pending', 'closed'], default: 'open' },
  messages: [{
    userId: String,
    content: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  closedAt: Date
});

const Guild = mongoose.model('Guild', guildSchema);
const User = mongoose.model('User', userSchema);
const License = mongoose.model('License', licenseSchema);
const Warning = mongoose.model('Warning', warningSchema);
const Shift = mongoose.model('Shift', shiftSchema);
const Activity = mongoose.model('Activity', activitySchema);
const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = { Guild, User, License, Warning, Shift, Activity, Ticket };
