const router = require('express').Router();
const ctrl = require('../controllers/meeting.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.use(requireAuth);
router.get('/', ctrl.list);
router.post('/', ctrl.create);

module.exports = router;
