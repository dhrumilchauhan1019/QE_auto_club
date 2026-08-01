const router = require('express').Router();
const ctrl = require('../controllers/activitylog.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.use(requireAuth);
router.get('/', ctrl.list);

module.exports = router;
