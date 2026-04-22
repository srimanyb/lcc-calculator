const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: 80,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    passwordHash: {
        type: String,
        required: true,
        select: false, // Never returned in queries by default
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    lastLogin: Date,
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash')) return next();
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
});

// Compare plain text password to hash
userSchema.methods.comparePassword = async function (plainText) {
    return bcrypt.compare(plainText, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
