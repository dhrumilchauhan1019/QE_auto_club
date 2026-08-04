const router = require('express').Router();
const ctrl = require('../controllers/followup.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.use(requireAuth);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.patch('/:id/complete', ctrl.complete);
router.get('/widgets/summary', ctrl.widgets);

module.exports = router;