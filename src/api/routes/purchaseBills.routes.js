const express = require('express');
const multer = require('multer');
const controller = require('../controllers/purchaseBills.controller');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/bulk-upload', upload.single('file'), controller.bulkUpload);

module.exports = router;