const router = require('express').Router();
const ctrl = require('../controllers/proposal.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.use(requireAuth);
router.post('/', ctrl.create);
router.get('/:id/summary', ctrl.summary);
router.patch('/:id/status', ctrl.updateStatus);

module.exports = router;
