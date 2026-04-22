const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    eventName: {
        type: String,
        required: [true, 'Event name is required'],
        trim: true,
    },
    numberOfPeople: {
        type: Number,
        required: [true, 'Number of people is required'],
        min: 1,
    },
    date: {
        type: Date,
        required: [true, 'Event date is required'],
    },
    timeType: {
        type: String,
        enum: ['Lunch', 'Dinner'],
        required: [true, 'Time type is required'],
    },
    recipes: [{
        recipeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' },
        name: String,
        targetServings: Number,
        baseServing: Number,
    }],
    ingredients: [{
        name: String,
        qty: Number,
        unit: String,
    }],
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
