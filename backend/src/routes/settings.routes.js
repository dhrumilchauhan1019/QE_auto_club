const router = require('express').Router();
const ctrl = require('../controllers/settings.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

router.use(requireAuth);
router.get('/', ctrl.list);
router.put('/', requireRole('admin'), ctrl.update);

module.exports = router;
