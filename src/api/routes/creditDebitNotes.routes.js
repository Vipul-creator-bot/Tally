const express = require('express');
const controller = require('../controllers/creditDebitNotes.controller');

const router = express.Router();
router.post('/', controller.createCreditOrDebitNote);

module.exports = router;