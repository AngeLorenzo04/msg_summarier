import { Request, Response } from 'express';
import { isWhatsAppConnected, getWhatsAppChats, fetchWhatsAppMessages } from '../services/whatsappClient';
import { isTelegramConnected, getTelegramChats, fetchTelegramMessages } from '../services/telegramClient';
import { sendToWebhook } from '../services/webhookService';
import { AutoParseRequest, WebhookPayload } from '../types';

export const getStatus = (req: Request, res: Response) => {
  res.json({
    whatsapp: isWhatsAppConnected(),
    telegram: isTelegramConnected()
  });
};

export const getChats = async (req: Request, res: Response) => {
  const { platform } = req.query;

  try {
    let chats = [];
    if (platform === 'whatsapp') {
      chats = await getWhatsAppChats();
    } else if (platform === 'telegram') {
      chats = await getTelegramChats();
    } else {
      return res.status(400).json({ error: 'Invalid platform. Use whatsapp or telegram.' });
    }

    res.json({ chats });
  } catch (error: any) {
    console.error('getChats error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch chats' });
  }
};

export const handleAutoParse = async (req: Request, res: Response) => {
  const { taskId, userId, platform, chatId, timeStart, timeEnd } = req.body as AutoParseRequest;

  if (!taskId || !userId || !platform || !chatId) {
    return res.status(400).json({ error: 'Missing required fields (taskId, userId, platform, chatId)' });
  }

  try {
    let parseResult;
    if (platform === 'whatsapp') {
      parseResult = await fetchWhatsAppMessages(chatId, timeStart, timeEnd);
    } else if (platform === 'telegram') {
      parseResult = await fetchTelegramMessages(chatId, timeStart, timeEnd);
    } else {
      return res.status(400).json({ error: 'Invalid platform.' });
    }

    const payload: WebhookPayload = {
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
      }
    };

    // Send to n8n webhook
    const summaryData = await sendToWebhook(payload);
    
    res.status(200).json({ message: 'Success', summary: summaryData, taskId });
  } catch (error: any) {
    console.error('Auto parse error:', error);
    res.status(500).json({ error: error.message || 'Internal processing error' });
  }
};
