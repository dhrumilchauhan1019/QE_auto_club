const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const dashboardCtrl = require('../controllers/dashboard.controller');
const reportCtrl = require('../controllers/report.controller');
const automationCtrl = require('../controllers/automation.controller');
const aiCtrl = require('../controllers/ai.controller');

router.get('/dashboard', requireAuth, dashboardCtrl.overview);
router.get('/dashboard/calls-by-day', requireAuth, dashboardCtrl.callsByDay);
router.get('/reports/daily', requireAuth, reportCtrl.daily);
router.post('/automation/run', requireAuth, requireRole('admin', 'manager'), automationCtrl.run);
router.get('/ai/assist/:id', requireAuth, aiCtrl.assist);

module.exports = router;
