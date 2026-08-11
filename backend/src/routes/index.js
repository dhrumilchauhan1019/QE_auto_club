const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/prospects', require('./prospect.routes'));
router.use('/csv', require('./csv.routes'));
router.use('/caller', require('./caller.routes'));
router.use('/followups', require('./followup.routes'));
router.use('/board', require('./board.routes'));
router.use('/proposals', require('./proposal.routes'));
router.use('/contracts', require('./contract.routes'));
router.use('/payments', require('./payment.routes'));
router.use('/meetings', require('./meeting.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/activity-logs', require('./activitylog.routes'));
router.use('/settings', require('./settings.routes'));
router.use('/twilio', require('./twilio.routes'));
router.use('/', require('./misc.routes'));

module.exports = router;