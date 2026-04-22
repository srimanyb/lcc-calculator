const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Recipe = require('../models/Recipe');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

// All routes require admin access
router.use(adminOnly);

// GET /api/admin/users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 }).lean();
        res.json({ users });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch users.' });
    }
});

// PATCH /api/admin/users/:id — update role
router.patch('/users/:id', async (req, res) => {
    try {
        const { role } = req.body;
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Role must be "user" or "admin".' });
        }

        // Prevent self-demotion
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot change your own role.' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true, runValidators: true }
        ).lean();

        if (!user) return res.status(404).json({ message: 'User not found.' });
        res.json({ user });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update user role.' });
    }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
    try {
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot delete your own account.' });
        }
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });
        // Also remove their recipes
        await Recipe.deleteMany({ owner: req.params.id });
        res.json({ message: 'User and their recipes deleted.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete user.' });
    }
});

// GET /api/admin/recipes — all recipes across all users
router.get('/recipes', async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit) || 30, 100);

        const [recipes, total] = await Promise.all([
            Recipe.find()
                .populate('owner', 'name email')
                .sort({ updatedAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Recipe.countDocuments(),
        ]);

        res.json({ recipes, total, page, pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch recipes.' });
    }
});

// DELETE /api/admin/recipes/:id — force delete (admin)
router.delete('/recipes/:id', async (req, res) => {
    try {
        const recipe = await Recipe.findByIdAndDelete(req.params.id);
        if (!recipe) return res.status(404).json({ message: 'Recipe not found.' });
        res.json({ message: 'Recipe deleted.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete recipe.' });
    }
});

// GET /api/admin/login-activity — paginated login & register events with user info
router.get('/login-activity', async (req, res) => {
    try {
        const page  = Math.max(parseInt(req.query.page)  || 1, 1);
        const limit = Math.min(parseInt(req.query.limit) || 25, 50);
        const eventFilter = { eventType: { $in: ['login', 'register'] } };

        const [events, total] = await Promise.all([
            AnalyticsEvent.find(eventFilter)
                .populate('userId', 'name email role lastLogin createdAt')
                .sort({ timestamp: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            AnalyticsEvent.countDocuments(eventFilter),
        ]);

        // Aggregate quick stats for today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const [todayLogins, todayRegistrations] = await Promise.all([
            AnalyticsEvent.countDocuments({ eventType: 'login',    timestamp: { $gte: startOfDay } }),
            AnalyticsEvent.countDocuments({ eventType: 'register', timestamp: { $gte: startOfDay } }),
        ]);

        // Sanitise output — ensure no passwordHash leaks via populated userId
        const safeEvents = events.map(ev => ({
            _id:       ev._id,
            eventType: ev.eventType,
            timestamp: ev.timestamp,
            user: ev.userId ? {
                id:        ev.userId._id,
                name:      ev.userId.name,
                email:     ev.userId.email,
                role:      ev.userId.role,
                lastLogin: ev.userId.lastLogin,
                joinedAt:  ev.userId.createdAt,
            } : null,
        }));

        res.json({
            events: safeEvents,
            total,
            page,
            pages: Math.ceil(total / limit),
            stats: { todayLogins, todayRegistrations },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch login activity.' });
    }
});

// GET /api/admin/users/:id/logins — login history for a specific user
router.get('/users/:id/logins', async (req, res) => {
    try {
        const events = await AnalyticsEvent.find({
            userId: req.params.id,
            eventType: { $in: ['login', 'register'] },
        })
            .sort({ timestamp: -1 })
            .limit(50)
            .lean();

        res.json({ events });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch user login history.' });
    }
});

module.exports = router;

