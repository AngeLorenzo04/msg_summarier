import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import { handleParseRequest } from './controllers/parseController';
import { getStatus, getChats, handleAutoParse } from './controllers/apiController';
import { initWhatsAppClient } from './services/whatsappClient';
import { initTelegramClient } from './services/telegramClient';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configure multer for file uploads to /tmp
const upload = multer({ dest: '/tmp/' });

// Middleware for parsing JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static UI
app.use(express.static('public'));

// Routes
app.post('/process', upload.single('file'), handleParseRequest);
app.get('/api/status', getStatus);
app.get('/api/chats', getChats);
app.post('/api/parse/auto', handleAutoParse);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', zdr_enabled: true });
});

// Start the server
app.listen(port, () => {
  console.log(`\n==================================================`);
  console.log(`ZDR Parsing Worker listening on port ${port}`);
  console.log(`==================================================\n`);
  if (!process.env.N8N_WEBHOOK_URL) {
    console.warn('WARNING: N8N_WEBHOOK_URL is not set in the environment.');
  }

  // Initialize automation clients
  console.log('Initializing automation clients...');
  initWhatsAppClient();
  initTelegramClient().catch(console.error);
});
