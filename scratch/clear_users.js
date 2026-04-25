const mongoose = require('mongoose');

const uri = "mongodb+srv://sriman:Sriman%4010@cluster0.vs6trum.mongodb.net/menumaster?retryWrites=true&w=majority";

async function clearData() {
    try {
        console.log('📡 Connecting to database to clear accounts...');
        await mongoose.connect(uri);
        
        const userCount = await mongoose.connection.db.collection('users').countDocuments();
        const recipeCount = await mongoose.connection.db.collection('recipes').countDocuments();
        const eventCount = await mongoose.connection.db.collection('events').countDocuments();
        
        console.log(`🗑 Found ${userCount} users, ${recipeCount} recipes, and ${eventCount} events.`);
        
        await mongoose.connection.db.collection('users').deleteMany({});
        await mongoose.connection.db.collection('recipes').deleteMany({});
        await mongoose.connection.db.collection('events').deleteMany({});
        await mongoose.connection.db.collection('analyticsevents').deleteMany({});
        
        console.log('✅ All accounts and data have been removed.');
        
        // Re-create the default admin account
        const bcrypt = require('bcryptjs');
        const passwordHash = await bcrypt.hash('admin123', 10);
        
        await mongoose.connection.db.collection('users').insertOne({
            name: 'LCC Admin',
            email: 'admin@lcc.com',
            passwordHash: passwordHash,
            role: 'admin',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        console.log('👑 Default admin account (admin@lcc.com / admin123) has been re-created.');
        
    } catch (err) {
        console.error('❌ Error clearing data:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

clearData();
