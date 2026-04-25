const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authentication required. Please log in.' });
        }

        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET || 'menumaster_super_secret_change_in_production_2024';
        const decoded = jwt.verify(token, secret);

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: 'User no longer exists.' });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error('[Auth Middleware Error]', err.message);
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};
