const sqliteRepository = require('./sqlite.repository');
const firebaseRepository = require('./firebase.repository');
const authService = require('../../../common/services/authService');

function getBaseRepository() {
    // CLOSED BETA: Always use SQLite (Firebase disabled)
    return sqliteRepository;
    
    /* FIREBASE VERSION - Re-enable when ready for public release
    const user = authService.getCurrentUser();
    if (user && user.isLoggedIn) {
        return firebaseRepository;
    }
    return sqliteRepository;
    */
}

const summaryRepositoryAdapter = {
    saveSummary: ({ sessionId, tldr, text, bullet_json, action_json, model }) => {
        const uid = authService.getCurrentUserId();
        return getBaseRepository().saveSummary({ uid, sessionId, tldr, text, bullet_json, action_json, model });
    },
    getSummaryBySessionId: (sessionId) => {
        return getBaseRepository().getSummaryBySessionId(sessionId);
    }
};

module.exports = summaryRepositoryAdapter; 