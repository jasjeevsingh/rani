/**
 * Migration: Add subscription fields to users table
 * Date: 2025-11-17
 * Description: Adds Stripe subscription tracking fields to the users table
 */

const Database = require('better-sqlite3');
const path = require('node:path');
const { app } = require('electron');

function runMigration(db) {
    console.log('[Migration] Adding subscription fields to users table...');
    
    try {
        // Add new columns for subscription management
        const alterStatements = [
            'ALTER TABLE users ADD COLUMN api_key_mode TEXT DEFAULT \'shared\'',
            'ALTER TABLE users ADD COLUMN stripe_customer_id TEXT',
            'ALTER TABLE users ADD COLUMN subscription_id TEXT',
            'ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT \'inactive\'',
            'ALTER TABLE users ADD COLUMN subscription_start_date INTEGER',
            'ALTER TABLE users ADD COLUMN subscription_end_date INTEGER',
            'ALTER TABLE users ADD COLUMN subscription_cancel_at INTEGER'
        ];

        for (const statement of alterStatements) {
            try {
                db.exec(statement);
                console.log(`[Migration] Executed: ${statement}`);
            } catch (error) {
                // Column might already exist, that's okay
                if (error.message.includes('duplicate column name')) {
                    console.log(`[Migration] Column already exists, skipping: ${statement}`);
                } else {
                    throw error;
                }
            }
        }

        // Set api_key_mode to 'shared' for existing users (assume they were using shared key)
        const updateExistingUsers = db.prepare(`
            UPDATE users 
            SET api_key_mode = 'shared',
                subscription_status = 'inactive'
            WHERE api_key_mode IS NULL
        `);
        const info = updateExistingUsers.run();
        console.log(`[Migration] Updated ${info.changes} existing users with api_key_mode`);

        console.log('[Migration] Successfully added subscription fields');
        return { success: true };
    } catch (error) {
        console.error('[Migration] Error adding subscription fields:', error);
        return { success: false, error: error.message };
    }
}

// Allow running as standalone script for testing
if (require.main === module) {
    const dbPath = path.join(app.getPath('userData'), 'rani.db');
    const db = new Database(dbPath);
    runMigration(db);
    db.close();
}

module.exports = { runMigration };
