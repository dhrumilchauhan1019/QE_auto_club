require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { errorHandler } = require('./middlewares/error.middleware');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false })); // needed for Twilio's form-encoded webhooks

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', (req, res, next) => {
  // Without this, GET /api/... responses can get cached by the browser or an intermediate
  // proxy (Render's edge, corporate networks, etc.) since Express sends no cache headers by
  // default. That produces exactly this bug: you edit a record, the PUT succeeds, the app
  // re-fetches the list right after, but gets served a stale cached copy of the old GET
  // response instead of hitting the server again - looks like "the edit didn't save" even
  // though it did.
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api', routes);

app.use(errorHandler);

module.exports = app;