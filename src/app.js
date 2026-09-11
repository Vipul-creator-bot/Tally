const express = require('express');
const routes = require('./api/routes');
const { errorHandler } = require('./api/middleware/errorHandler');
const { apiKeyAuth } = require('./api/middleware/apiKeyAuth');

const app = express();
app.use(express.json());
app.use('/api/v1', apiKeyAuth, routes);
app.use(errorHandler);

module.exports = app;