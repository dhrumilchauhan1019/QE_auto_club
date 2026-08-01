const app = require('./app');
const { runAutomation } = require('./controllers/automation.controller');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`QE Auto Club API running on port ${PORT}`));

// keeps the notification bell populated without anyone having to click "Run Inactivity Check"
const AUTOMATION_INTERVAL_MS = 10 * 60 * 1000;
setInterval(() => { runAutomation().catch(err => console.error('Automation run failed:', err.message)); }, AUTOMATION_INTERVAL_MS);
runAutomation().catch(err => console.error('Initial automation run failed:', err.message));
