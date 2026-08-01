const router = require('express').Router();
const ctrl = require('../controllers/caller.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.use(requireAuth);
router.get('/next', ctrl.next);
router.get('/queue', ctrl.queue);
router.post('/log', ctrl.logCall);

module.exports = router;
