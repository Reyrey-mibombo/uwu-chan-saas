const express = require('express');
const router = express.Router();
const { User, Guild, Shift, Warning, Activity } = require('../database/mongo');

const MANAGE_GUILD = 0x20; // Discord permission bit

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
            User.countDocuments({ 'staff.points': { $gt: 0 } }),
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
            User.countDocuments({ userId: { $exists: true }, 'staff.points': { $gt: 0 } }),
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
        for (const key of allowed) {
            if (req.body[key] !== undefined) update[`settings.${key}`] = req.body[key];
        }
        const result = await Guild.findOneAndUpdate({ guildId }, { $set: update }, { upsert: true, new: true });
        res.json({ success: true, settings: result.settings });
    } catch (e) { res.status(500).json({ error: e.message }); }
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
        res.json({ ...defaults, ...(guildDb?.promotionRequirements || {}) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/dashboard/guild/:guildId/promotion-requirements
router.patch('/guild/:guildId/promotion-requirements', auth, guildAuth, async (req, res) => {
    try {
        const { guildId } = req.params;
        const validRanks = ['trial', 'staff', 'senior', 'manager', 'admin'];
        const update = {};
        for (const rank of validRanks) {
            if (req.body[rank]) update[`promotionRequirements.${rank}`] = req.body[rank];
        }
        await Guild.findOneAndUpdate({ guildId }, { $set: update }, { upsert: true });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/dashboard/guild/:guildId/staff — staff list
router.get('/guild/:guildId/staff', auth, guildAuth, async (req, res) => {
    try {
        const { guildId } = req.params;
        const users = await User.find({ 'staff.rank': { $exists: true } }).sort({ 'staff.points': -1 }).limit(50).lean();
        const enriched = await Promise.all(users.map(async u => {
            const [shifts, warns] = await Promise.all([
                Shift.countDocuments({ userId: u.userId, guildId, endTime: { $ne: null } }),
                Warning.countDocuments({ userId: u.userId, guildId })
            ]);
            return { userId: u.userId, username: u.username || 'Unknown', avatar: u.avatar, rank: u.staff?.rank || 'member', points: u.staff?.points || 0, consistency: u.staff?.consistency || 0, streak: u.staff?.streak || 0, shifts, warnings: warns };
        }));
        res.json(enriched);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/dashboard/guild/:guildId/staff/:userId — update rank/points
router.patch('/guild/:guildId/staff/:userId', auth, guildAuth, async (req, res) => {
    try {
        const { guildId, userId } = req.params;
        const allowed = ['rank', 'points'];
        const update = {};
        for (const f of allowed) if (req.body[f] !== undefined) update[`staff.${f}`] = req.body[f];
        await User.findOneAndUpdate({ userId }, { $set: update }, { upsert: false });
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
        await Warning.findByIdAndDelete(req.params.warnId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
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
        const users = await User.find({ 'staff.rank': { $exists: true } }).limit(50).lean();
        const result = await Promise.all(users.map(async u => {
            const rank = u.staff?.rank || 'member';
            const currentIdx = RANK_ORDER.indexOf(rank);
            const nextRank = RANK_ORDER[currentIdx + 1];
            const req2 = REQS[nextRank] || null;
            const [shifts, warns] = await Promise.all([
                Shift.countDocuments({ userId: u.userId, guildId }),
                Warning.countDocuments({ userId: u.userId, guildId })
            ]);
            const eligible = req2 && (u.staff?.points || 0) >= req2.points && shifts >= req2.shifts && (u.staff?.consistency || 0) >= req2.consistency && warns <= req2.maxWarnings;
            return { userId: u.userId, username: u.username || 'Unknown', rank, nextRank, points: u.staff?.points || 0, consistency: u.staff?.consistency || 0, shifts, warnings: warns, eligible, req: req2 };
        }));
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
