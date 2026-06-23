const express = require('express');
const router = express.Router();
const taxonomyController = require('../controllers/taxonomyController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', taxonomyController.getAllTaxonomies);
router.post('/:type', protect, taxonomyController.addOption);
router.delete('/:type/:option', protect, taxonomyController.removeOption);

module.exports = router;
