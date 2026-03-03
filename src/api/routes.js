const express = require('express');
const router = express.Router();
const { User, Guild, Shift, Warning, Activity, ApplicationConfig } = require('../database/mongo');

// Input sanitization helper to prevent NoSQL injection and prototype pollution
function sanitizeInput(input) {
    if (typeof input !== 'object' || input === null) return input;
    const sanitized = {};
    for (const key of Object.keys(input)) {
        // Prevent prototype pollution by filtering out dangerous keys
        if (key.startsWith('__') || key === 'constructor' || key === 'prototype') continue;
        // Only allow alphanumeric and underscore in keys
        if (!/^[a-zA-Z0-9_]+$/.test(key)) continue;
        sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
}

// Validate ObjectId format
function isValidObjectId(id) {
    return /^[0-9a-fA-F]{24}$/.test(id);
}

const { invalidateCache } = require('../dashboardSystems');
const { validateGuildId, validateUserId, validatePagination, validateNoSQLInjection, isValidHexColor } = require('../middleware/validation');
const logger = require('../utils/logger');

const MANAGE_GUILD = 0x20; // Discord permission bit

// Apply NoSQL injection validation to all routes
router.use(validateNoSQLInjection);

/* ── Auth middleware: verify Discord Bearer token ── */
async function auth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const r = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: header }
        });
        if (!r.ok) return res.status(401).json({ error: 'Invalid token' });
        req.discordUser = await r.json();
        req.token = header.split(' ')[1];
        next();
    } catch { res.status(401).json({ error: 'Auth failed' }); }
}

/* ── Guild auth: user must have MANAGE_GUILD in 'guildId' param ── */
async function guildAuth(req, res, next) {
    const { guildId } = req.params;
    if (!guildId) return res.status(400).json({ error: 'guildId required' });
    try {
        const r = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${req.token}` }
        });
        if (!r.ok) return res.status(401).json({ error: 'Cannot fetch guilds' });
        const guilds = await r.json();
        const guild = guilds.find(g => g.id === guildId);
        if (!guild) return res.status(403).json({ error: 'Not in this server' });
        if (!(guild.permissions & MANAGE_GUILD) && !guild.owner) return res.status(403).json({ error: 'Need Manage Server permission' });
        req.discordGuild = guild;
        next();
    } catch (e) { res.status(500).json({ error: e.message }); }
}

/* ══════════════════════════════════════════
   PUBLIC
══════════════════════════════════════════ */

// GET /api/dashboard/stats — public bot stats
router.get('/stats', async (req, res) => {
    try {
        const [staffCount, totalShifts] = await Promise.all([
            User.countDocuments({ 'guilds.staff.points': { $gt: 0 } }),
            Shift.countDocuments({ endTime: { $ne: null } })
        ]);
        res.json({ staffCount, totalShifts, commandCount: 271 });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ══════════════════════════════════════════
   USER
══════════════════════════════════════════ */

// GET /api/dashboard/me — current user's profile
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.discordUser.id }).lean();
        res.json({ discord: req.discordUser, staff: user?.staff || null });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/dashboard/guilds — all guilds where user has MANAGE_GUILD
router.get('/guilds', auth, async (req, res) => {
    try {
        const r = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${req.token}` }
        });
        if (!r.ok) return res.status(401).json({ error: 'Cannot fetch guilds' });
        const all = await r.json();
        // Only show servers where user is owner OR has Manage Guild permission
        const managed = all.filter(g => g.owner || (BigInt(g.permissions) & BigInt(MANAGE_GUILD)));
        // Enrich with DB data
        const guildIds = managed.map(g => g.id);
        const dbGuilds = await Guild.find({ guildId: { $in: guildIds } }).lean();
        const dbMap = Object.fromEntries(dbGuilds.map(g => [g.guildId, g]));
        res.json(managed.map(g => ({
            id: g.id,
            name: g.name,
            icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.webp?size=64` : null,
            owner: g.owner,
            botInstalled: !!dbMap[g.id],
            tier: dbMap[g.id]?.license?.tier || 'free',
            memberCount: dbMap[g.id]?.memberCount || null
        })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ══════════════════════════════════════════
   GUILD-SPECIFIC (requires MANAGE_GUILD)
══════════════════════════════════════════ */

// GET /api/dashboard/guild/:guildId — guild overview
router.get('/guild/:guildId', auth, guildAuth, async (req, res) => {
    try {
        const { guildId } = req.params;
        const [guildDb, staffCount, shiftCount, warnCount, activityCount] = await Promise.all([
            Guild.findOne({ guildId }).lean(),
            User.countDocuments({ 'guilds': { $elemMatch: { guildId, 'staff.points': { $gt: 0 } } } }),
            Shift.countDocuments({ guildId, endTime: { $ne: null } }),
            Warning.countDocuments({ guildId }),
            Activity.countDocuments({ guildId, createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } })
        ]);
        res.json({
            guild: req.discordGuild,
            db: guildDb,
            stats: { staffCount, shiftCount, warnCount, activityCount }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/dashboard/guild/:guildId/settings — all settings
router.get('/guild/:guildId/settings', auth, guildAuth, async (req, res) => {
    try {
        const guildDb = await Guild.findOne({ guildId: req.params.guildId }).lean();
        res.json(guildDb?.settings || {});
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/dashboard/guild/:guildId/settings — update settings
router.patch('/guild/:guildId/settings', auth, guildAuth, async (req, res) => {
    try {
        const { guildId } = req.params;
        const allowed = ['modChannelId', 'staffChannelId', 'logChannelId', 'autoPromotion', 'ticketEnabled', 'alertsEnabled', 'shiftTrackingEnabled'];
        const update = {};
        const sanitizedBody = sanitizeInput(req.body);
        for (const key of allowed) {
            if (sanitizedBody[key] !== undefined) {
                // Validate channel IDs are numeric strings
                if (key.endsWith('ChannelId') && sanitizedBody[key] !== null) {
                    if (!/^\d{17,20}$/.test(String(sanitizedBody[key]))) {
                        return res.status(400).json({ error: `Invalid ${key} format` });
                    }
                }
                // Validate boolean fields
                if (['autoPromotion', 'ticketEnabled', 'alertsEnabled', 'shiftTrackingEnabled'].includes(key)) {
                    update[`settings.${key}`] = !!sanitizedBody[key];
                } else {
                    update[`settings.${key}`] = sanitizedBody[key];
                }
            }
        }
        const result = await Guild.findOneAndUpdate({ guildId }, { $set: update }, { upsert: true, new: true });
        invalidateCache(guildId);
        res.json({ success: true, settings: result.settings });
    } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/dashboard/guild/:guildId/promotion-requirements
router.get('/guild/:guildId/promotion-requirements', auth, guildAuth, async (req, res) => {
    try {
        const guildDb = await Guild.findOne({ guildId: req.params.guildId }).lean();
        const defaults = {
            trial: { points: 0, shifts: 0, consistency: 0, maxWarnings: 99 },
            staff: { points: 100, shifts: 5, consistency: 70, maxWarnings: 3 },
            senior: { points: 300, shifts: 10, consistency: 75, maxWarnings: 2 },
            manager: { points: 600, shifts: 20, consistency: 80, maxWarnings: 1 },
            admin: { points: 1000, shifts: 30, consistency: 85, maxWarnings: 0 }
        };
        const activeRequires = { ...defaults, ...(guildDb?.promotionRequirements || {}) };
        res.json({
            requirements: activeRequires,
            rankRoles: guildDb?.rankRoles || {},
            promotionChannel: guildDb?.settings?.promotionChannel || null
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/dashboard/guild/:guildId/promotion-requirements
router.patch('/guild/:guildId/promotion-requirements', auth, guildAuth, async (req, res) => {
    try {
        const { guildId } = req.params;
        const validRanks = ['trial', 'staff', 'senior', 'manager', 'admin'];
        const update = {};
        const sanitizedBody = sanitizeInput(req.body);

        // Helper to validate numeric range
        const validateNumber = (val, min, max, name) => {
            const num = Number(val);
            if (isNaN(num) || num < min || num > max) {
                throw new Error(`${name} must be between ${min} and ${max}`);
            }
            return num;
        };

        if (sanitizedBody.requirements) {
            for (const rank of validRanks) {
                if (sanitizedBody.requirements[rank]) {
                    const reqData = sanitizedBody.requirements[rank];
                    const cleanReq = {};
                    if (reqData.points !== undefined) cleanReq.points = validateNumber(reqData.points, 0, 10000, 'points');
                    if (reqData.shifts !== undefined) cleanReq.shifts = validateNumber(reqData.shifts, 0, 1000, 'shifts');
                    if (reqData.consistency !== undefined) cleanReq.consistency = validateNumber(reqData.consistency, 0, 100, 'consistency');
                    if (reqData.maxWarnings !== undefined) cleanReq.maxWarnings = validateNumber(reqData.maxWarnings, 0, 99, 'maxWarnings');
                    update[`promotionRequirements.${rank}`] = cleanReq;
                }
            }
        }
        if (sanitizedBody.rankRoles) {
            for (const rank of validRanks) {
                if (sanitizedBody.rankRoles[rank] !== undefined) {
                    const roleId = sanitizedBody.rankRoles[rank];
                    // Validate role ID format
                    if (roleId !== null && !/^\d{17,20}$/.test(String(roleId))) {
                        return res.status(400).json({ error: `Invalid role ID for ${rank}` });
                    }
                    update[`rankRoles.${rank}`] = roleId;
                }
            }
        }
        if (sanitizedBody.promotionChannel !== undefined) {
            const channelId = sanitizedBody.promotionChannel;
            if (channelId !== null && !/^\d{17,20}$/.test(String(channelId))) {
                return res.status(400).json({ error: 'Invalid channel ID format' });
            }
            update['settings.promotionChannel'] = channelId || null;
        }

        await Guild.findOneAndUpdate({ guildId }, { $set: update }, { upsert: true });
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: e.message || 'Invalid input' }); }
});

// GET /api/dashboard/guild/:guildId/alerts
router.get('/guild/:guildId/alerts', auth, guildAuth, async (req, res) => {
    try {
        const guildDb = await Guild.findOne({ guildId: req.params.guildId }).lean();
        res.json(guildDb?.settings?.alerts || { enabled: false, channelId: null, roleId: null, threshold: 50 });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/dashboard/guild/:guildId/alerts
router.patch('/guild/:guildId/alerts', auth, guildAuth, async (req, res) => {
    try {
        const { guildId } = req.params;
        const { enabled, channelId, roleId, threshold } = req.body;
        const update = {
            'settings.alerts.enabled': !!enabled,
            'settings.alerts.channelId': channelId || null,
            'settings.alerts.roleId': roleId || null,
            'settings.alerts.threshold': parseInt(threshold) || 50
        };
        await Guild.findOneAndUpdate({ guildId }, { $set: update });
        invalidateCache(guildId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/dashboard/guild/:guildId/applications
router.get('/guild/:guildId/applications', auth, guildAuth, async (req, res) => {
    try {
        let config = await ApplicationConfig.findOne({ guildId: req.params.guildId }).lean();
        if (!config) {
            config = { enabled: false, applyChannelId: null, reviewChannelId: null, reviewerRoleId: null, panelTitle: 'Server Application', questions: ["Why do you want to join our team?", "What experience do you have?", "How active can you be?"] };
        }
        res.json(config);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/dashboard/guild/:guildId/applications
router.patch('/guild/:guildId/applications', auth, guildAuth, async (req, res) => {
    try {
        const { guildId } = req.params;
        const sanitizedBody = sanitizeInput(req.body);
        
        // Validate allowed fields
        const allowedFields = ['enabled', 'applyChannelId', 'reviewChannelId', 'reviewerRoleId', 'panelTitle', 'questions'];
        const update = { updatedAt: Date.now() };
        
        for (const field of allowedFields) {
            if (sanitizedBody[field] !== undefined) {
                // Validate channel/role IDs
                if ((field.endsWith('ChannelId') || field.endsWith('RoleId')) && sanitizedBody[field] !== null) {
                    if (!/^\d{17,20}$/.test(String(sanitizedBody[field]))) {
                        return res.status(400).json({ error: `Invalid ${field} format` });
                    }
                }
                // Validate questions array
                if (field === 'questions' && Array.isArray(sanitizedBody[field])) {
                    update[field] = sanitizedBody[field].filter(q => typeof q === 'string' && q.length <= 500).slice(0, 10);
                } else {
                    update[field] = sanitizedBody[field];
                }
            }
        }
        
        await ApplicationConfig.findOneAndUpdate({ guildId }, { $set: update }, { upsert: true });
        invalidateCache(guildId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/dashboard/guild/:guildId/branding
router.get('/guild/:guildId/branding', auth, guildAuth, async (req, res) => {
    try {
        const guildDb = await Guild.findOne({ guildId: req.params.guildId }).lean();
        res.json(guildDb?.customBranding || { color: null, footer: null, iconURL: null });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/dashboard/guild/:guildId/branding
router.patch('/guild/:guildId/branding', auth, guildAuth, async (req, res) => {
    try {
        const { guildId } = req.params;
        // Check tier authorization safely
        const guildDb = await Guild.findOne({ guildId }).lean();
        const tier = guildDb?.premium?.tier || 'free';
        if (tier !== 'enterprise' && tier !== 'v6') {
            return res.status(403).json({ error: 'Custom branding requires the Enterprise tier.' });
        }

        const { color, footer, iconURL } = req.body;
        const update = {
            'customBranding.color': color || null,
            'customBranding.footer': footer || null,
            'customBranding.iconURL': iconURL || null
        };
        await Guild.findOneAndUpdate({ guildId }, { $set: update });
        invalidateCache(guildId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/dashboard/guild/:guildId/staff — staff list
router.get('/guild/:guildId/staff', auth, guildAuth, async (req, res) => {
    try {
        const { guildId } = req.params;
        const users = await User.find({ 'guilds': { $elemMatch: { guildId, 'staff.rank': { $exists: true } } } }).limit(50).lean();
        const enriched = await Promise.all(users.map(async u => {
            const guildEntry = u.guilds.find(g => g.guildId === guildId);
            const staff = guildEntry?.staff || {};
            const [shifts, warns] = await Promise.all([
                Shift.countDocuments({ userId: u.userId, guildId, endTime: { $ne: null } }),
                Warning.countDocuments({ userId: u.userId, guildId })
            ]);
            return {
                userId: u.userId,
                username: u.username || 'Unknown',
                avatar: u.avatar,
                rank: staff.rank || 'member',
                points: staff.points || 0,
                consistency: staff.consistency || 0,
                streak: staff.streak || 0,
                shifts,
                warnings: warns
            };
        }));
        res.json(enriched.sort((a, b) => b.points - a.points));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/dashboard/guild/:guildId/staff/:userId — update rank/points
router.patch('/guild/:guildId/staff/:userId', auth, guildAuth, async (req, res) => {
    try {
        const { guildId, userId } = req.params;
        const allowed = ['rank', 'points'];
        const update = {};
        for (const f of allowed) if (req.body[f] !== undefined) update[`guilds.$.staff.${f}`] = req.body[f];
        await User.findOneAndUpdate(
            { userId, 'guilds.guildId': guildId },
            { $set: update },
            { upsert: false }
        );
        // Log the action
        await Activity.create({ guildId, userId: req.discordUser.id, type: 'admin_action', meta: `Updated staff ${userId}: ${JSON.stringify(req.body)}`, createdAt: new Date() }).catch(() => { });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/dashboard/guild/:guildId/warnings — recent warnings
router.get('/guild/:guildId/warnings', auth, guildAuth, async (req, res) => {
    try {
        const warnings = await Warning.find({ guildId: req.params.guildId }).sort({ createdAt: -1 }).limit(40).lean();
        res.json(warnings);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/dashboard/guild/:guildId/warnings/:warnId — remove warning
router.delete('/guild/:guildId/warnings/:warnId', auth, guildAuth, async (req, res) => {
    try {
        const { warnId } = req.params;
        if (!isValidObjectId(warnId)) {
            return res.status(400).json({ error: 'Invalid warning ID format' });
        }
        await Warning.findByIdAndDelete(warnId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/dashboard/guild/:guildId/shifts — recent shifts
router.get('/guild/:guildId/shifts', auth, guildAuth, async (req, res) => {
    try {
        const shifts = await Shift.find({ guildId: req.params.guildId, endTime: { $ne: null } })
            .sort({ startTime: -1 }).limit(30).lean();
        res.json(shifts.map(s => ({
            id: s._id, userId: s.userId, guildId: s.guildId,
            duration: s.duration || 0,
            hoursFormatted: s.duration ? `${Math.floor(s.duration / 3600)}h ${Math.floor((s.duration % 3600) / 60)}m` : 'N/A',
            pointsEarned: s.duration ? Math.floor(s.duration / 300) : 0,
            startTime: s.startTime, endTime: s.endTime, status: s.status || 'completed'
        })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/dashboard/guild/:guildId/promotion-status — all staff eligibility
router.get('/guild/:guildId/promotion-status', auth, guildAuth, async (req, res) => {
    try {
        const { guildId } = req.params;
        const guildDb = await Guild.findOne({ guildId }).lean();
        const RANK_ORDER = ['member', 'trial', 'staff', 'senior', 'manager', 'admin'];
        const REQS = {
            trial: { points: 0, shifts: 0, consistency: 0, maxWarnings: 99 },
            staff: { points: 100, shifts: 5, consistency: 70, maxWarnings: 3 },
            senior: { points: 300, shifts: 10, consistency: 75, maxWarnings: 2 },
            manager: { points: 600, shifts: 20, consistency: 80, maxWarnings: 1 },
            admin: { points: 1000, shifts: 30, consistency: 85, maxWarnings: 0 },
            ...(guildDb?.promotionRequirements || {})
        };
        const users = await User.find({ 'guilds': { $elemMatch: { guildId, 'staff.rank': { $exists: true } } } }).limit(50).lean();
        const result = await Promise.all(users.map(async u => {
            const guildEntry = u.guilds.find(g => g.guildId === guildId);
            const staff = guildEntry?.staff || {};
            const rank = staff.rank || 'member';
            const currentIdx = RANK_ORDER.indexOf(rank);
            const nextRank = RANK_ORDER[currentIdx + 1];
            const req2 = REQS[nextRank] || null;
            const [shifts, warns] = await Promise.all([
                Shift.countDocuments({ userId: u.userId, guildId }),
                Warning.countDocuments({ userId: u.userId, guildId })
            ]);
            const eligible = req2 && (staff.points || 0) >= req2.points && shifts >= req2.shifts && (staff.consistency || 0) >= req2.consistency && warns <= req2.maxWarnings;
            return { userId: u.userId, username: u.username || 'Unknown', rank, nextRank, points: staff.points || 0, consistency: staff.consistency || 0, shifts, warnings: warns, eligible, req: req2 };
        }));
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/dashboard/guild/:guildId/ticket-logs
router.get('/guild/:guildId/ticket-logs', auth, guildAuth, async (req, res) => {
    try {
        const { Ticket } = require('../database/mongo');
        const { status, type } = req.query;
        const query = { guildId: req.params.guildId };
        if (status && status !== 'all') query.status = status;
        if (type) query.category = type;
        const tickets = await Ticket.find(query).sort({ createdAt: -1 }).limit(50).lean();
        res.json(tickets.map(t => ({
            id: t._id.toString().slice(-6).toUpperCase(),
            fullId: t._id,
            username: t.username || 'Unknown',
            userId: t.userId,
            category: t.category || 'unknown',
            status: t.status || 'open',
            staffName: t.staffName || null,
            reason: t.reason || null,
            feedback: t.feedback || null,
            claimedBy: t.claimedByName || null,
            closedBy: t.closedByName || null,
            createdAt: t.createdAt
        })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/dashboard/guild/:guildId/activity-logs
router.get('/guild/:guildId/activity-logs', auth, guildAuth, async (req, res) => {
    try {
        const activities = await Activity.find({ guildId: req.params.guildId })
            .sort({ createdAt: -1 }).limit(60).lean();
        res.json(activities.map(a => ({
            id: a._id,
            userId: a.userId,
            type: a.type || 'activity',
            meta: a.meta || (a.data?.action) || '',
            createdAt: a.createdAt
        })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/dashboard/guild/:guildId/promo-history — promotion/demotion records
router.get('/guild/:guildId/promo-history', auth, guildAuth, async (req, res) => {
    try {
        const { guildId } = req.params;
        // Read from Activity log where type includes 'promo' or 'admin_action' with rank changes
        const promoActivities = await Activity.find({
            guildId,
            $or: [{ type: 'promotion' }, { type: 'demotion' }, { type: 'admin_action' }]
        }).sort({ createdAt: -1 }).limit(40).lean();

        // Also enumerate users with lastPromotionDate for that guild
        const recentPromotees = await User.find({
            'guilds': { $elemMatch: { guildId, 'staff.lastPromotionDate': { $exists: true } } }
        }).sort({ 'staff.lastPromotionDate': -1 }).limit(20).lean();

        const promoList = recentPromotees.map(u => {
            const g = u.guilds?.find(x => x.guildId === guildId);
            return {
                userId: u.userId,
                username: u.username || 'Unknown',
                avatar: u.avatar,
                currentRank: g?.staff?.rank || 'unknown',
                lastPromotionDate: g?.staff?.lastPromotionDate || null,
                points: g?.staff?.points || 0,
                type: 'promotion'
            };
        });

        // Merge activity log entries
        const activityEntries = promoActivities
            .filter(a => a.meta && (a.meta.includes('promote') || a.meta.includes('demote') || a.meta.includes('Updated staff')))
            .map(a => ({
                userId: a.userId,
                username: null,
                meta: a.meta,
                type: a.type,
                createdAt: a.createdAt
            }));

        res.json({ promotions: promoList, activityLog: activityEntries });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/dashboard/guild/:guildId/leaderboard — staff sorted by points
router.get('/guild/:guildId/leaderboard', auth, guildAuth, async (req, res) => {
    try {
        const { guildId } = req.params;
        const users = await User.find({ 'guilds': { $elemMatch: { guildId, 'staff.points': { $gt: 0 } } } }).limit(25).lean();
        const list = users.map(u => {
            const guildEntry = u.guilds.find(g => g.guildId === guildId);
            const staff = guildEntry?.staff || {};
            return {
                id: u.userId, username: u.username || 'Unknown',
                avatar: u.avatar, points: staff.points || 0,
                rank: staff.rank || 'member', consistency: staff.consistency || 0,
                activity: staff.consistency || 0
            };
        });
        res.json(list.sort((a, b) => b.points - a.points));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ══════════════════════════════════════════
   SYSTEM SETTINGS (Auto-working systems)
══════════════════════════════════════════ */

// GET /api/dashboard/guild/:guildId/systems/automod
router.get('/guild/:guildId/systems/automod', auth, guildAuth, async (req, res) => {
    try {
        const g = await Guild.findOne({ guildId: req.params.guildId }).lean();
        res.json(g?.settings?.modules?.automod || {});
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/dashboard/guild/:guildId/systems/automod
router.patch('/guild/:guildId/systems/automod', auth, guildAuth, async (req, res) => {
    try {
        const sanitizedBody = sanitizeInput(req.body);
        await Guild.findOneAndUpdate(
            { guildId: req.params.guildId },
            { $set: { 'settings.modules.automod': sanitizedBody } },
            { upsert: true, new: true }
        );
        invalidateCache(req.params.guildId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/dashboard/guild/:guildId/systems/welcome
router.get('/guild/:guildId/systems/welcome', auth, guildAuth, async (req, res) => {
    try {
        const g = await Guild.findOne({ guildId: req.params.guildId }).lean();
        res.json(g?.settings?.modules?.welcome || {});
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/dashboard/guild/:guildId/systems/welcome
router.patch('/guild/:guildId/systems/welcome', auth, guildAuth, async (req, res) => {
    try {
        const sanitizedBody = sanitizeInput(req.body);
        await Guild.findOneAndUpdate(
            { guildId: req.params.guildId },
            { $set: { 'settings.modules.welcome': sanitizedBody } },
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/dashboard/guild/:guildId/systems/autorole
router.get('/guild/:guildId/systems/autorole', auth, guildAuth, async (req, res) => {
    try {
        const g = await Guild.findOne({ guildId: req.params.guildId }).lean();
        res.json(g?.settings?.modules?.autorole || {});
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/dashboard/guild/:guildId/systems/autorole
router.patch('/guild/:guildId/systems/autorole', auth, guildAuth, async (req, res) => {
    try {
        const sanitizedBody = sanitizeInput(req.body);
        await Guild.findOneAndUpdate(
            { guildId: req.params.guildId },
            { $set: { 'settings.modules.autorole': sanitizedBody } },
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/dashboard/guild/:guildId/systems/logging
router.get('/guild/:guildId/systems/logging', auth, guildAuth, async (req, res) => {
    try {
        const g = await Guild.findOne({ guildId: req.params.guildId }).lean();
        res.json(g?.settings?.modules?.logging || {});
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/dashboard/guild/:guildId/systems/logging
router.patch('/guild/:guildId/systems/logging', auth, guildAuth, async (req, res) => {
    try {
        const sanitizedBody = sanitizeInput(req.body);
        await Guild.findOneAndUpdate(
            { guildId: req.params.guildId },
            { $set: { 'settings.modules.logging': sanitizedBody } },
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/dashboard/guild/:guildId/systems/antispam
router.get('/guild/:guildId/systems/antispam', auth, guildAuth, async (req, res) => {
    try {
        const g = await Guild.findOne({ guildId: req.params.guildId }).lean();
        res.json(g?.settings?.modules?.antispam || {});
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/dashboard/guild/:guildId/systems/antispam
router.patch('/guild/:guildId/systems/antispam', auth, guildAuth, async (req, res) => {
    try {
        const sanitizedBody = sanitizeInput(req.body);
        await Guild.findOneAndUpdate(
            { guildId: req.params.guildId },
            { $set: { 'settings.modules.antispam': sanitizedBody } },
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/dashboard/guild/:guildId/systems/tickets
router.get('/guild/:guildId/systems/tickets', auth, guildAuth, async (req, res) => {
    try {
        const g = await Guild.findOne({ guildId: req.params.guildId }).lean();
        res.json(g?.settings?.modules?.tickets || {
            enabled: !!g?.settings?.ticketEnabled,
            panelChannelId: g?.settings?.ticketChannel || null
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/dashboard/guild/:guildId/systems/tickets
router.patch('/guild/:guildId/systems/tickets', auth, guildAuth, async (req, res) => {
    try {
        const sanitizedBody = sanitizeInput(req.body);
        await Guild.findOneAndUpdate(
            { guildId: req.params.guildId },
            {
                $set: {
                    'settings.modules.tickets': sanitizedBody,
                    'settings.ticketEnabled': !!sanitizedBody.enabled,
                    'settings.ticketChannel': sanitizedBody.panelChannelId || null
                }
            },
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
