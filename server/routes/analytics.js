const express = require('express');
const router = express.Router();
const AnalyticsEvent = require('../models/AnalyticsEvent');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

// POST /api/analytics/event — frontend beacon
router.post('/event', auth, async (req, res) => {
    try {
        const { eventType, recipeId, meta } = req.body;
        const allowed = ['recipe_view', 'recipe_use', 'search', 'report_export'];
        if (!allowed.includes(eventType)) {
            return res.status(400).json({ message: 'Invalid event type.' });
        }
        await AnalyticsEvent.create({
            eventType,
            userId: req.user._id,
            recipeId: recipeId || null,
            meta: meta || {},
        });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: 'Failed to log event.' });
    }
});

// GET /api/analytics/summary — admin only
router.get('/summary', auth, adminOnly, async (req, res) => {
    try {
        const [eventCounts, topRecipes, dailyLogins] = await Promise.all([
            // Events by type last 30 days
            AnalyticsEvent.aggregate([
                { $match: { timestamp: { $gte: new Date(Date.now() - 30 * 86400 * 1000) } } },
                { $group: { _id: '$eventType', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),

            // Top 5 most viewed recipes
            AnalyticsEvent.aggregate([
                { $match: { eventType: 'recipe_view', recipeId: { $ne: null } } },
                { $group: { _id: '$recipeId', views: { $sum: 1 } } },
                { $sort: { views: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: 'recipes',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'recipe',
                    },
                },
                { $unwind: '$recipe' },
                { $project: { name: '$recipe.name', views: 1 } },
            ]),

            // Logins per day last 7 days
            AnalyticsEvent.aggregate([
                {
                    $match: {
                        eventType: 'login',
                        timestamp: { $gte: new Date(Date.now() - 7 * 86400 * 1000) },
                    },
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
        ]);

        res.json({ eventCounts, topRecipes, dailyLogins });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to load analytics.' });
    }
});

// GET /api/analytics/recipe/:id — per-recipe stats (owner or admin)
router.get('/recipe/:id', auth, async (req, res) => {
    try {
        const stats = await AnalyticsEvent.aggregate([
            {
                $match: {
                    recipeId: require('mongoose').Types.ObjectId.createFromHexString(req.params.id),
                },
            },
            { $group: { _id: '$eventType', count: { $sum: 1 } } },
        ]);
        res.json({ stats });
    } catch (err) {
        res.status(500).json({ message: 'Failed to load recipe stats.' });
    }
});

module.exports = router;
