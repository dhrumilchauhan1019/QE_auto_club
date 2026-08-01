const router = require('express').Router();
const ctrl = require('../controllers/csv.controller');
const upload = require('../config/multer');
const { requireAuth } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

router.use(requireAuth, requireRole('admin', 'manager'));
router.post('/preview', upload.single('file'), ctrl.preview);
router.post('/import', ctrl.importRows);
router.get('/history', ctrl.history);

module.exports = router;
