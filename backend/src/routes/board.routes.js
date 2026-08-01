const router = require('express').Router();
const ctrl = require('../controllers/board.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.use(requireAuth);
router.get('/', ctrl.board);
router.patch('/:id/move', ctrl.moveCard);

module.exports = router;
