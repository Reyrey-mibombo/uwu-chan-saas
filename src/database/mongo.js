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
    promotionChannel: String,
    // [Phase 3] Dynamic Role assigning for shifted staff
    onDutyRole: { type: String, default: null },
    // New: activity alert settings
    alerts: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String, default: null },
      roleId: { type: String, default: null },
      threshold: { type: Number, default: 50 }
    }
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
  // Enterprise custom branding configuration
  customBranding: {
    color: { type: String, default: null },
    footer: { type: String, default: null },
    iconURL: { type: String, default: null }
  },
  // Dynamic application system config
  applicationConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Full 10-field promotion requirements (customizable by tier)
  promotionRequirements: {
    staff: {
      points: { type: Number, default: 100 },
      shifts: { type: Number, default: 5 },
      consistency: { type: Number, default: 70 },
      maxWarnings: { type: Number, default: 3 },
      shiftHours: { type: Number, default: 0 },
      achievements: { type: Number, default: 0 },
      reputation: { type: Number, default: 0 },
      daysInServer: { type: Number, default: 0 },
      cleanRecordDays: { type: Number, default: 0 },
      customNote: { type: String, default: '' }
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
  customCommands: [{
    trigger: { type: String, required: true },
    response: { type: String, required: true },
    type: { type: String, enum: ['exact', 'starts', 'contains'], default: 'exact' },
    isEmbed: { type: Boolean, default: true },
    enabled: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
  }],
  achievements: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: String,
    icon: String,
    criteria: {
      type: { type: String, enum: ['points', 'shifts', 'warnings', 'consistency'], default: 'points' },
      value: { type: Number, default: 0 }
    }
  }],
  roleRewards: [{
    roleId: { type: String, required: true },
    requiredPoints: { type: Number, default: 0 },
    name: String
  }],
  stats: {
    commandsUsed: { type: Number, default: 0 },
    membersJoined: { type: Number, default: 0 },
    messagesProcessed: { type: Number, default: 0 },
    warnings: { type: Number, default: 0 },
    lastActivity: Date
  },
  welcomeConfig: {
    enabled: { type: Boolean, default: false },
    channelId: String,
    title: { type: String, default: 'Welcome to the Server!' },
    message: { type: String, default: 'We are glad to have you here!' },
    imageURL: String,
    buttons: {
      rules: { enabled: { type: Boolean, default: false }, label: { type: String, default: 'Read Rules' } },
      roles: { enabled: { type: Boolean, default: false }, label: { type: String, default: 'Get Roles' } },
      apply: { enabled: { type: Boolean, default: false }, label: { type: String, default: 'Apply Now' } }
    }
  },
  autoChatConfig: {
    enabled: { type: Boolean, default: false },
    channelId: String,
    interval: { type: Number, default: 60 }, // Frequency in minutes
    messages: { type: [String], default: ["How is everyone doing today?", "Don't forget to check out our rules!", "Welcome to the community!"] },
    lastSent: Date,
    nextSent: Date
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
    nickname: String,
    // Multi-Server Isolated Staff Stats
    staff: {
      rank: { type: String, default: 'trial' },
      points: { type: Number, default: 0 },
      warnings: { type: Number, default: 0 },
      shiftTime: { type: Number, default: 0 },
      lastShift: Date,
      consistency: { type: Number, default: 100 },
      reputation: { type: Number, default: 0 },
      achievements: [String],
      streak: { type: Number, default: 0 },
      trophies: { type: [String], default: [] },
      promotionPending: { type: Boolean, default: false },
      lastPromotionCheck: Date,
      lastPromotionDate: Date
    }
  }],
  licenses: [{
    licenseKey: String,
    guildId: String,
    tier: String,
    activatedAt: Date,
    expiresAt: Date,
    isActive: Boolean
  }],
  // Global staff profile (Cross-Server identity)
  staff: {
    tagline: { type: String, default: 'Operational Personnel' },
    profileColor: { type: String, default: null },
    xp: { type: Number, default: 0 }, // Global XP
    level: { type: Number, default: 1 }, // Global Level
    commandUsage: { type: mongoose.Schema.Types.Mixed, default: {} },
    perks: { type: [String], default: [] },
    equippedPerk: { type: String, default: null },
    honorPoints: { type: Number, default: 0 },
    honorific: { type: String, default: 'Unranked' }
  },
  stats: {
    commandsUsed: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 }
  },
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
  notes: String,
  status: { type: String, enum: ['active', 'paused', 'ended'], default: 'active' },
  pauses: [{
    startedAt: Date,
    endedAt: Date,
    duration: { type: Number, default: 0 }
  }]
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

const applicationConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: false },
  applyChannelId: { type: String, default: null },
  reviewChannelId: { type: String, default: null },
  reviewerRoleId: { type: String, default: null },
  panelTitle: { type: String, default: 'Server Application' },
  questions: {
    type: [String],
    default: [
      "Why do you want to join our team?",
      "What experience do you have?",
      "How active can you be?"
    ]
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const applicationRequestSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  username: String,
  globalName: String,
  answers: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ['pending', 'accepted', 'denied'], default: 'pending' },
  messageId: String,
  channelId: String,
  reviewedBy: String,
  reviewedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const Guild = mongoose.model('Guild', guildSchema);
const User = mongoose.model('User', userSchema);
const License = mongoose.model('License', licenseSchema);
const Warning = mongoose.model('Warning', warningSchema);
const Shift = mongoose.model('Shift', shiftSchema);
const Activity = mongoose.model('Activity', activitySchema);
const Ticket = mongoose.model('Ticket', ticketSchema);
const ApplicationConfig = mongoose.model('ApplicationConfig', applicationConfigSchema);
const ApplicationRequest = mongoose.model('ApplicationRequest', applicationRequestSchema);

module.exports = {
  Guild,
  User,
  License,
  Warning,
  Shift,
  Activity,
  Ticket,
  ApplicationConfig,
  ApplicationRequest
};