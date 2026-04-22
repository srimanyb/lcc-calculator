const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const Recipe = require('../models/Recipe');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const auth = require('../middleware/auth');

// GET /api/recipes?page=1&limit=20&public=true
router.get('/', auth, async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = (page - 1) * limit;

        // Return own recipes + public recipes from others
        const filter = {
            $or: [{ owner: req.user._id }, { isPublic: true }],
        };

        const [recipes, total] = await Promise.all([
            Recipe.find(filter)
                .populate('owner', 'name')
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Recipe.countDocuments(filter),
        ]);

        res.json({ recipes, total, page, pages: Math.ceil(total / limit) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch recipes.' });
    }
});

// GET /api/recipes/search?q=butter+chicken
router.get('/search', [
    auth,
    query('q').trim().notEmpty().withMessage('Search query required'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { q } = req.query;

        // Track search analytics
        AnalyticsEvent.create({ eventType: 'search', userId: req.user._id, meta: { query: q } }).catch(() => {});

        const recipes = await Recipe.find({
            $text: { $search: q },
            $or: [{ owner: req.user._id }, { isPublic: true }],
        }, {
            score: { $meta: 'textScore' },
        })
            .populate('owner', 'name')
            .sort({ score: { $meta: 'textScore' } })
            .limit(30)
            .lean();

        res.json({ recipes, count: recipes.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Search failed.' });
    }
});

// GET /api/recipes/:id
router.get('/:id', auth, async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id).populate('owner', 'name').lean();
        if (!recipe) return res.status(404).json({ message: 'Recipe not found.' });

        const canAccess = recipe.isPublic || recipe.owner._id.toString() === req.user._id.toString();
        if (!canAccess && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        // Increment view count (fire-and-forget)
        Recipe.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }).exec();
        AnalyticsEvent.create({ eventType: 'recipe_view', userId: req.user._id, recipeId: recipe._id }).catch(() => {});

        res.json({ recipe });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch recipe.' });
    }
});

// POST /api/recipes
router.post('/', [
    auth,
    body('name').trim().notEmpty().withMessage('Recipe name is required').isLength({ max: 120 }),
    body('baseServing').isInt({ min: 1 }).withMessage('Base serving must be a positive integer'),
    body('ingredients').isArray({ min: 1 }).withMessage('At least one ingredient is required'),
    body('ingredients.*.name').trim().notEmpty().withMessage('Ingredient name required'),
    body('ingredients.*.qty').isFloat({ min: 0 }).withMessage('Ingredient quantity must be a positive number'),
    body('ingredients.*.unit').trim().notEmpty().withMessage('Ingredient unit required'),
], async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can create recipes.' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { name, baseServing, ingredients, tags, isPublic } = req.body;

        const recipe = await Recipe.create({
            name,
            baseServing,
            ingredients,
            tags: tags || [],
            isPublic: !!isPublic,
            owner: req.user._id,
        });

        AnalyticsEvent.create({ eventType: 'recipe_create', userId: req.user._id, recipeId: recipe._id }).catch(() => {});

        res.status(201).json({ recipe });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to create recipe.' });
    }
});

// PUT /api/recipes/:id
router.put('/:id', [
    auth,
    body('name').optional().trim().notEmpty().isLength({ max: 120 }),
    body('baseServing').optional().isInt({ min: 1 }),
    body('ingredients').optional().isArray({ min: 1 }),
], async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can edit recipes.' });
        }

        const recipe = await Recipe.findById(req.params.id);
        if (!recipe) return res.status(404).json({ message: 'Recipe not found.' });

        const allowedFields = ['name', 'baseServing', 'ingredients', 'tags', 'isPublic'];
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) recipe[field] = req.body[field];
        });

        await recipe.save();
        res.json({ recipe });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update recipe.' });
    }
});

// DELETE /api/recipes/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can delete recipes.' });
        }

        const recipe = await Recipe.findById(req.params.id);
        if (!recipe) return res.status(404).json({ message: 'Recipe not found.' });

        await recipe.deleteOne();
        AnalyticsEvent.create({ eventType: 'recipe_delete', userId: req.user._id, recipeId: recipe._id }).catch(() => {});

        res.json({ message: 'Recipe deleted successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete recipe.' });
    }
});

// POST /api/recipes/:id/use — increment useCount when added to Menu Calculator
router.post('/:id/use', auth, async (req, res) => {
    try {
        await Recipe.findByIdAndUpdate(req.params.id, { $inc: { useCount: 1 } });
        AnalyticsEvent.create({ eventType: 'recipe_use', userId: req.user._id, recipeId: req.params.id }).catch(() => {});
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: 'Failed to track use.' });
    }
});

module.exports = router;
