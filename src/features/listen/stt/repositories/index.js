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

const sttRepositoryAdapter = {
    addTranscript: ({ sessionId, speaker, text }) => {
        const uid = authService.getCurrentUserId();
        return getBaseRepository().addTranscript({ uid, sessionId, speaker, text });
    },
    getAllTranscriptsBySessionId: (sessionId) => {
        return getBaseRepository().getAllTranscriptsBySessionId(sessionId);
    }
};

module.exports = sttRepositoryAdapter; 