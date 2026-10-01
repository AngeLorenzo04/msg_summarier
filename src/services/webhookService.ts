import axios from 'axios';
import { WebhookPayload } from '../types';

export async function sendToWebhook(payload: WebhookPayload): Promise<void> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('N8N_WEBHOOK_URL is not defined in environment variables.');
    return;
  }

  try {
    await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log(`Successfully sent payload to webhook for task: ${payload.task_id}`);
  } catch (error) {
    console.error(`Failed to send payload to webhook for task: ${payload.task_id}`, error);
    // Depending on requirements, we might want to throw or retry here.
    // For ZDR, we usually just log and let it fail.
  }
}
