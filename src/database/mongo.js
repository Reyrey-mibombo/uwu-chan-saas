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
    modChannel: String,
    promotionChannel: String  // channel to announce promotions
  },
  // rank → Discord role ID mapping (set via /setup_promo)
  rankRoles: {
    trial: { type: String, default: null },
    staff: { type: String, default: null },
    senior: { type: String, default: null },
    manager: { type: String, default: null },
    admin: { type: String, default: null }
  },
  // Helper application system configuration
  helperConfig: {
    enabled: { type: Boolean, default: false },
    staffRole: { type: String, default: null },
    logChannel: { type: String, default: null },
    acceptedRole: { type: String, default: null }
  },
  // Dynamic application system config
  applicationConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Full 10-field promotion requirements (customizable by tier)
  // v1 (free): points, shifts, consistency
  // v2 (free): + maxWarnings, shiftHours
  // v3 (premium): + achievements, reputation
  // v6 (enterprise): + daysInServer, cleanRecordDays, customNote
  promotionRequirements: {
    staff: {
      points: { type: Number, default: 100 },   // req 1 (v1)
      shifts: { type: Number, default: 5 },   // req 2 (v1)
      consistency: { type: Number, default: 70 },   // req 3 (v1)
      maxWarnings: { type: Number, default: 3 },   // req 4 (v2)
      shiftHours: { type: Number, default: 0 },   // req 5 (v2) — 0 = disabled
      achievements: { type: Number, default: 0 },   // req 6 (v3)
      reputation: { type: Number, default: 0 },   // req 7 (v3)
      daysInServer: { type: Number, default: 0 },   // req 8 (enterprise)
      cleanRecordDays: { type: Number, default: 0 },   // req 9 (enterprise)
      customNote: { type: String, default: '' }    // req 10 (enterprise) — text shown in DM
    },
    senior: {
      points: { type: Number, default: 300 },
      shifts: { type: Number, default: 10 },
      consistency: { type: Number, default: 75 },
      maxWarnings: { type: Number, default: 2 },
      shiftHours: { type: Number, default: 0 },
      achievements: { type: Number, default: 0 },
      reputation: { type: Number, default: 0 },
      daysInServer: { type: Number, default: 0 },
      cleanRecordDays: { type: Number, default: 0 },
      customNote: { type: String, default: '' }
    },
    manager: {
      points: { type: Number, default: 600 },
      shifts: { type: Number, default: 20 },
      consistency: { type: Number, default: 80 },
      maxWarnings: { type: Number, default: 1 },
      shiftHours: { type: Number, default: 0 },
      achievements: { type: Number, default: 0 },
      reputation: { type: Number, default: 0 },
      daysInServer: { type: Number, default: 0 },
      cleanRecordDays: { type: Number, default: 0 },
      customNote: { type: String, default: '' }
    },
    admin: {
      points: { type: Number, default: 1000 },
      shifts: { type: Number, default: 30 },
      consistency: { type: Number, default: 85 },
      maxWarnings: { type: Number, default: 0 },
      shiftHours: { type: Number, default: 0 },
      achievements: { type: Number, default: 0 },
      reputation: { type: Number, default: 0 },
      daysInServer: { type: Number, default: 0 },
      cleanRecordDays: { type: Number, default: 0 },
      customNote: { type: String, default: '' }
    }
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
    achievements: [String],
    promotionPending: { type: Boolean, default: false }, // true = owner DM already sent, awaiting decision
    lastPromotionCheck: Date // last time this user was checked for promotion
  },
  stats: {
    commandsUsed: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 }
  },
  applications: [{
    id: String,
    guildId: String,
    username: String,
    userId: String,
    whyJoin: String,
    experience: String,
    activity: String,
    age: String,
    other: String,
    status: { type: String, enum: ['pending', 'accepted', 'denied'], default: 'pending' },
    messageId: String,
    channelId: String,
    reviewedBy: String,
    reviewedAt: Date,
    createdAt: { type: Date, default: Date.now }
  }],
  helperApplications: [{
    id: String,
    guildId: String,
    username: String,
    userId: String,
    whyHelper: String,
    howAssist: String,
    experience: String,
    activity: String,
    other: String,
    status: { type: String, enum: ['pending', 'accepted', 'denied'], default: 'pending' },
    messageId: String,
    channelId: String,
    reviewedBy: String,
    reviewedAt: Date,
    createdAt: { type: Date, default: Date.now }
  }],
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