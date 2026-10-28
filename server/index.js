const { createApp } = require('./app');
const port = Number(process.env.PORT) || 3001;
createApp().listen(port, () => console.log(`Dorm Marketplace API listening on http://localhost:${port}`));
