const router = require('express').Router();
const ctrl = require('../controllers/prospect.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

router.use(requireAuth);
router.get('/export', requireRole('admin', 'manager', 'executive'), ctrl.exportCsv);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', requireRole('admin', 'manager', 'caller'), ctrl.create);
router.put('/:id', ctrl.update);
router.patch('/:id/override-tier', requireRole('admin', 'manager'), ctrl.overrideTier);
router.patch('/:id/archive', requireRole('admin', 'manager', 'closer'), ctrl.archive);
router.delete('/:id', requireRole('admin', 'caller'), ctrl.remove);

module.exports = router;