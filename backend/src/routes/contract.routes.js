const router = require('express').Router();
const ctrl = require('../controllers/contract.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

router.use(requireAuth);
router.get('/', ctrl.list);
router.patch('/:id/sign', requireRole('admin', 'manager'), ctrl.sign);

module.exports = router;
