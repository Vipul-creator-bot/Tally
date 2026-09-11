const express = require('express');
const controller = require('../controllers/customers.controller');

const router = express.Router();

router.get('/', controller.listCustomers);
router.post('/', controller.createCustomer);
router.put('/:name', controller.updateCustomer);
router.get('/:name/balance', controller.getLedgerBalance);

module.exports = router;