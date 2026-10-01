import { Request, Response } from 'express';
import { parseWhatsAppChat } from '../services/whatsappParser';
import { sendToWebhook } from '../services/webhookService';
import { ParseRequest, WebhookPayload } from '../types';
import fs from 'fs/promises';

export const handleParseRequest = (req: Request, res: Response) => {
  const file = req.file;
  const { taskId, userId, platform, timeStart, timeEnd } = req.body as Partial<ParseRequest>;

  // Basic Validation
  if (!file) {
    return res.status(400).json({ error: 'Missing file' });
  }
  if (!taskId || !userId || !platform || !timeStart || !timeEnd) {
    // We should still clean up the file if validation fails!
    fs.unlink(file.path).catch(console.error);
    return res.status(400).json({ error: 'Missing required fields in form data' });
  }
  if (platform !== 'whatsapp') {
    fs.unlink(file.path).catch(console.error);
    return res.status(400).json({ error: 'Only whatsapp platform is supported' });
  }

  // Respond to client immediately (Asynchronous processing)
  res.status(202).json({ message: 'Processing started', taskId });

  // Start background processing
  processFileAsync({
    filePath: file.path,
    taskId,
    userId,
    platform,
    timeStart,
    timeEnd,
  });
};

async function processFileAsync(params: {
  filePath: string;
  taskId: string;
  userId: string;
  platform: 'whatsapp';
  timeStart: string;
  timeEnd: string;
}) {
  const { filePath, taskId, userId, platform, timeStart, timeEnd } = params;
  let payload: WebhookPayload;

  try {
    const parseResult = await parseWhatsAppChat(filePath, timeStart, timeEnd);

    payload = {
      task_id: taskId,
      user_id: userId,
      platform,
      status: 'success',
      metadata: {
        participant_count: parseResult.participantCount,
        total_messages_parsed: parseResult.totalMessagesParsed,
      },
      payload: {
        clean_transcript: parseResult.cleanTranscript,
      },
    };
  } catch (error: any) {
    console.error(`Error parsing chat for task ${taskId}:`, error);
    payload = {
      task_id: taskId,
      user_id: userId,
      platform,
      status: 'error',
      error_message: error.message || 'Unknown error during parsing',
    };
  } finally {
    // ZERO DATA RETENTION (ZDR) ENFORCEMENT
    // Ensure the file is deleted from /tmp in both success and error cases
    try {
      await fs.unlink(filePath);
      console.log(`ZDR: Successfully deleted temporary file ${filePath}`);
    } catch (cleanupError) {
      console.error(`ZDR FATAL ERROR: Failed to delete temporary file ${filePath}`, cleanupError);
    }
  }

  // Send result to webhook
  await sendToWebhook(payload);
}
