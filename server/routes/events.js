const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const auth = require('../middleware/auth');

// GET /api/events
router.get('/', auth, async (req, res) => {
    try {
        const events = await Event.find({ owner: req.user._id }).sort({ createdAt: -1 });
        res.json({ events });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch events.' });
    }
});

// GET /api/events/:id
router.get('/:id', auth, async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, owner: req.user._id });
        if (!event) return res.status(404).json({ message: 'Event not found.' });
        res.json({ event });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch event details.' });
    }
});

// POST /api/events
router.post('/', auth, async (req, res) => {
    try {
        const { eventName, numberOfPeople, date, timeType, recipes, ingredients } = req.body;
        
        const event = await Event.create({
            eventName,
            numberOfPeople,
            date,
            timeType,
            recipes,
            ingredients,
            owner: req.user._id,
        });

        res.status(201).json({ event });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to save event.' });
    }
});

module.exports = router;
