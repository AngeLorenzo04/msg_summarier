import axios from 'axios';
import { WebhookPayload } from '../types';

export async function sendToWebhook(payload: WebhookPayload): Promise<any> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('N8N_WEBHOOK_URL is not defined in environment variables.');
    throw new Error('Webhook URL not configured');
  }

  try {
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log(`Successfully sent payload to webhook for task: ${payload.task_id}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to send payload to webhook for task: ${payload.task_id}`, error);
    throw error;
  }
}
