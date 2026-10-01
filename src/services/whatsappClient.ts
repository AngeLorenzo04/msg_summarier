import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { ChatMetadata, ParseResult } from '../types';
import { isWithinInterval, parseISO, isValid } from 'date-fns';

let whatsappClient: Client | null = null;
let isConnected = false;

export const initWhatsAppClient = () => {
  whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  whatsappClient.on('qr', (qr) => {
    console.log('\n==================================================');
    console.log('WhatsApp Authentication Required!');
    console.log('Please scan the QR code below using your WhatsApp:');
    qrcode.generate(qr, { small: true });
    console.log('==================================================\n');
  });

  whatsappClient.on('ready', () => {
    console.log('✅ WhatsApp Client is READY!');
    isConnected = true;
  });

  whatsappClient.on('authenticated', () => {
    console.log('WhatsApp authenticated successfully. Waiting for chats to sync...');
    // Fallback: sometimes the ready event doesn't fire due to a known wwebjs bug
    setTimeout(() => {
      if (!isConnected) {
        console.log('✅ WhatsApp Client assumed READY (fallback)!');
        isConnected = true;
      }
    }, 15000);
  });

  whatsappClient.on('auth_failure', (msg) => {
    console.error('WhatsApp authentication failed:', msg);
    isConnected = false;
  });

  whatsappClient.on('disconnected', (reason) => {
    console.log('WhatsApp client was disconnected:', reason);
    isConnected = false;
  });

  whatsappClient.initialize().catch(console.error);
};

export const isWhatsAppConnected = () => isConnected || (whatsappClient && whatsappClient.info ? true : false);

export const getWhatsAppChats = async (): Promise<ChatMetadata[]> => {
  if (!whatsappClient) {
    throw new Error('WhatsApp client is not initialized');
  }

  try {
    const chats = await whatsappClient.getChats();
    return chats.map(chat => ({
      id: chat.id._serialized,
      name: chat.name || chat.id.user || 'Unknown Chat'
    }));
  } catch (err: any) {
    console.error('Real wwebjs error:', err);
    throw new Error('WhatsApp is still syncing your chats in the background. Please wait 30 seconds and try again.');
  }
};

export const fetchWhatsAppMessages = async (
  chatId: string,
  timeStartIso?: string,
  timeEndIso?: string
): Promise<ParseResult> => {
  if (!whatsappClient || !isConnected) {
    throw new Error('WhatsApp client is not connected');
  }

  const timeStart = timeStartIso ? parseISO(timeStartIso) : null;
  const timeEnd = timeEndIso ? parseISO(timeEndIso) : null;

  if (timeStart && !isValid(timeStart)) throw new Error('Invalid timeStart ISO string');
  if (timeEnd && !isValid(timeEnd)) throw new Error('Invalid timeEnd ISO string');

  const chat = await whatsappClient.getChatById(chatId);
  
  // Fetch messages. We fetch a large chunk if no date is specified, or iteratively if needed.
  // whatsapp-web.js limits fetchMessages to a certain amount per call, default 50. We can set limit: 1000 or more.
  // For production ZDR, we should paginate until we hit the timeStart bound.
  let allMessages: any[] = [];
  let hasMore = true;
  let lastMessageId: string | undefined = undefined;
  const BATCH_SIZE = 500;

  console.log(`Fetching messages for chat: ${chat.name}...`);

  while (hasMore) {
    const options: any = { limit: BATCH_SIZE };
    
    // whatsapp-web.js currently doesn't easily support pagination by 'before' cursor in all versions, 
    // but usually fetchMessages gets the *latest* N messages. 
    // To keep it simple for this MVP, we will fetch the last 2000 messages. 
    // (A full pagination requires managing message objects and IDs, which is complex).
    
    // Let's just fetch the last 10000 messages to simulate a full export for this MVP.
    const msgs = await chat.fetchMessages({ limit: 5000 }); 
    allMessages = msgs;
    hasMore = false; // We just take the last 5000 for safety instead of true pagination to avoid ban risk on rapid API calls
  }

  let cleanTranscript = '';
  const participants = new Set<string>();
  let totalMessagesParsed = 0;

  for (const msg of allMessages) {
    // Convert timestamp (unix seconds) to Date
    const msgDate = new Date(msg.timestamp * 1000);

    // Apply time filters
    if (timeStart && msgDate < timeStart) continue;
    if (timeEnd && msgDate > timeEnd) continue;

    // Filter out empty or media messages
    if (msg.hasMedia && !msg.body) continue;
    if (!msg.body) continue;

    const textLower = msg.body.toLowerCase();
    if (textLower.includes('<media omitted>') || textLower.includes('<media omesso>')) continue;

    const timeString = `[${msgDate.getHours().toString().padStart(2, '0')}:${msgDate.getMinutes().toString().padStart(2, '0')}]`;
    
    // Identify sender
    let sender = 'Me';
    if (!msg.fromMe) {
      const contact = await msg.getContact();
      sender = contact.name || contact.pushname || contact.number || 'Unknown';
    }

    cleanTranscript += `${timeString} ${sender}: ${msg.body}\n`;
    participants.add(sender);
    totalMessagesParsed++;
  }

  return {
    participantCount: participants.size,
    totalMessagesParsed,
    cleanTranscript: cleanTranscript.trim(),
  };
};
