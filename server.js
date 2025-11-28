const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;
const PUBLIC_DIR = path.join(__dirname, 'src');

app.use(cors());
app.use(express.static(PUBLIC_DIR));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`MSD Analyzer server running at http://localhost:${PORT}`);
});
