const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema({
    eventType: {
        type: String,
        required: true,
        enum: ['recipe_view', 'recipe_use', 'recipe_create', 'recipe_delete', 'search', 'report_export', 'login', 'register'],
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    recipeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recipe',
        default: null,
    },
    meta: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: { expires: '90d' }, // TTL — auto-delete after 90 days
    },
});

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
