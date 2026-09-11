// const express = require('express');
// const controller = require('../controllers/stockItems.controller');

// const router = express.Router();

// router.get('/', controller.listStockItems);
// router.post('/', controller.createStockItem);
// router.put('/:name', controller.updateStockItem);

// module.exports = router;

// new approach 

const express = require('express');
const multer = require('multer');
const controller = require('../controllers/stockItems.controller');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', controller.listStockItems);
router.post('/', controller.createStockItem);
router.put('/:name', controller.updateStockItem);
router.post('/bulk-upload', upload.single('file'), controller.bulkUpload);

module.exports = router;