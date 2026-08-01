const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

router.use(requireAuth);
router.get('/performance', requireRole('admin', 'manager'), ctrl.callerPerformance);
router.get('/', requireRole('admin'), ctrl.list);
router.post('/', requireRole('admin'), ctrl.create);
router.put('/:id', requireRole('admin'), ctrl.update);

module.exports = router;
