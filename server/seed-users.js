require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('./models/User');

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Check if admin exists
        let admin = await User.findOne({ email: 'admin@lcc.com' });
        if (!admin) {
            admin = await User.create({
                name: 'Admin User',
                email: 'admin@lcc.com',
                passwordHash: 'admin123',
                role: 'admin'
            });
            console.log('Admin user created: admin@lcc.com / admin123');
        } else {
            console.log('Admin user already exists: admin@lcc.com');
        }

        // Check if worker exists
        let worker = await User.findOne({ email: 'worker@lcc.com' });
        if (!worker) {
            worker = await User.create({
                name: 'Worker User',
                email: 'worker@lcc.com',
                passwordHash: 'worker123',
                role: 'user' // 'user' is the default enum for workers in the schema
            });
            console.log('Worker user created: worker@lcc.com / worker123');
        } else {
            console.log('Worker user already exists: worker@lcc.com');
        }

        console.log('User seeding complete.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedUsers();
