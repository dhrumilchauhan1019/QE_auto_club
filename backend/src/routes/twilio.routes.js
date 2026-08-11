const router = require('express').Router();
const ctrl = require('../controllers/twilio.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

// --- Twilio webhooks --------------------------------------------------
// Twilio calls these directly (no JWT available), so they stay unauthenticated.
// In production, add Twilio request-signature validation here (see the guide).
router.post('/voice', ctrl.voice);
router.post('/status', ctrl.status);
router.post('/dial-status', ctrl.dialStatus);
router.post('/recording-status', ctrl.recordingStatus);

// --- App-facing endpoints ----------------------------------------------
router.get('/token', requireAuth, ctrl.token);
router.get('/calls/:prospectId', requireAuth, ctrl.callsForProspect);
router.get('/calls/by-sid/:callSid', requireAuth, ctrl.callBySid);
router.post('/calls/:id/summary', requireAuth, ctrl.summarize);

module.exports = router;