import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import { handleParseRequest } from './controllers/parseController';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configure multer for file uploads to /tmp
const upload = multer({ dest: '/tmp/' });

// Middleware for parsing JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.post('/process', upload.single('file'), handleParseRequest);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', zdr_enabled: true });
});

// Start the server
app.listen(port, () => {
  console.log(`ZDR Parsing Worker listening on port ${port}`);
  if (!process.env.N8N_WEBHOOK_URL) {
    console.warn('WARNING: N8N_WEBHOOK_URL is not set in the environment.');
  }
});
