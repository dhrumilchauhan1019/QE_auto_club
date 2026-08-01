const router = require('express').Router();
const ctrl = require('../controllers/payment.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

router.use(requireAuth);
router.get('/', requireRole('admin', 'manager', 'executive', 'finance'), ctrl.list);
router.post('/', requireRole('admin', 'finance'), ctrl.create);

module.exports = router;
