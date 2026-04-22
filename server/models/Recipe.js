const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
}, { _id: false });

const recipeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Recipe name is required'],
        trim: true,
        maxlength: 120,
    },
    baseServing: {
        type: Number,
        required: [true, 'Base serving size is required'],
        min: 1,
    },
    ingredients: {
        type: [ingredientSchema],
        validate: [(arr) => arr.length > 0, 'At least one ingredient is required'],
    },
    tags: [{ type: String, lowercase: true, trim: true }],
    isPublic: { type: Boolean, default: false },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    viewCount: { type: Number, default: 0 },
    useCount: { type: Number, default: 0 },
}, { timestamps: true });

// Full-text search index
recipeSchema.index({ name: 'text', tags: 'text', 'ingredients.name': 'text' });

module.exports = mongoose.model('Recipe', recipeSchema);
