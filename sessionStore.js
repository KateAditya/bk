let activeSession = null;

module.exports = {
  setActiveSession(sessionId) {
    activeSession = sessionId;
  },

  getActiveSession() {
    return activeSession;
  },

  clearActiveSession() {
    activeSession = null;
  },
};
