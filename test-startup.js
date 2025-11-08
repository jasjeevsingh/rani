// Minimal test to identify which module hangs
require('dotenv').config();
console.log('✓ dotenv loaded');

if (require('electron-squirrel-startup')) {
    process.exit(0);
}
console.log('✓ squirrel check passed');

try {
    const { app } = require('electron');
    console.log('✓ electron app loaded');
} catch (e) {
    console.error('✗ electron app failed:', e.message);
}

try {
    const { createWindows } = require('./window/windowManager.js');
    console.log('✓ windowManager loaded');
} catch (e) {
    console.error('✗ windowManager failed:', e.message);
}

try {
    const listenService = require('./features/listen/listenService');
    console.log('✓ listenService loaded');
} catch (e) {
    console.error('✗ listenService failed:', e.message);
}

try {
    const databaseInitializer = require('./features/common/services/databaseInitializer');
    console.log('✓ databaseInitializer loaded');
} catch (e) {
    console.error('✗ databaseInitializer failed:', e.message);
}

try {
    const authService = require('./features/common/services/authService');
    console.log('✓ authService loaded');
} catch (e) {
    console.error('✗ authService failed:', e.message);
}

try {
    const askService = require('./features/ask/askService');
    console.log('✓ askService loaded');
} catch (e) {
    console.error('✗ askService failed:', e.message);
}

console.log('✓ All modules loaded successfully!');
process.exit(0);
