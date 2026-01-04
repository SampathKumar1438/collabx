import sequelize from '../config/database.js';
import '../models/index.js'; // Import models to ensure associations are loaded

async function migrate() {
    try {
        console.log('🔄 Starting database migration...');

        // Sync all models with the database
        await sequelize.sync({ alter: true });

        console.log('✅ Database migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
