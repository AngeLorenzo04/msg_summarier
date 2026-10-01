import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import input from 'input';
import { ChatMetadata, ParseResult } from '../types';
import { isValid, parseISO } from 'date-fns';
import dotenv from 'dotenv';

dotenv.config();

let telegramClient: TelegramClient | null = null;
let isConnected = false;

// Store the session string locally. In a real app, this should be in a DB or securely stored.
const apiId = parseInt(process.env.TELEGRAM_API_ID || '0');
const apiHash = process.env.TELEGRAM_API_HASH || '';
const stringSession = new StringSession(process.env.TELEGRAM_STRING_SESSION || '');

export const initTelegramClient = async () => {
  if (!apiId || !apiHash) {
    console.error('Telegram API_ID or API_HASH not found in .env. Telegram client will not start.');
    return;
  }

  telegramClient = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  try {
    // This will prompt in the terminal only if stringSession is empty/invalid
    await telegramClient.start({
      phoneNumber: async () => await input.text('Please enter your Telegram Phone Number (with +): '),
      password: async () => await input.password('Please enter your Telegram Password (if 2FA is enabled): '),
      phoneCode: async () => await input.text('Please enter the Telegram code you received: '),
      onError: (err) => console.log(err),
    });

    console.log('✅ Telegram Client is READY!');
    isConnected = true;
    
    const sessionString = telegramClient.session.save() as unknown as string;
    if (sessionString && !process.env.TELEGRAM_STRING_SESSION) {
      console.log('\n==================================================');
      console.log('SAVE THIS TO YOUR .env AS TELEGRAM_STRING_SESSION=');
      console.log(sessionString);
      console.log('==================================================\n');
    }
  } catch (error) {
    console.error('Failed to initialize Telegram client:', error);
  }
};

export const isTelegramConnected = () => isConnected;

export const getTelegramChats = async (): Promise<ChatMetadata[]> => {
  if (!telegramClient || !isConnected) {
    throw new Error('Telegram client is not connected');
  }

  // Get all dialogs (chats)
  const dialogs = await telegramClient.getDialogs({});
  return dialogs.map(dialog => ({
    id: dialog.id ? dialog.id.toString() : '',
    name: dialog.title || 'Unknown Chat'
  })).filter(chat => chat.id !== '');
};

export const fetchTelegramMessages = async (
  chatId: string,
  timeStartIso?: string,
  timeEndIso?: string
): Promise<ParseResult> => {
  if (!telegramClient || !isConnected) {
    throw new Error('Telegram client is not connected');
  }

  const timeStart = timeStartIso ? parseISO(timeStartIso) : null;
  const timeEnd = timeEndIso ? parseISO(timeEndIso) : null;

  if (timeStart && !isValid(timeStart)) throw new Error('Invalid timeStart ISO string');
  if (timeEnd && !isValid(timeEnd)) throw new Error('Invalid timeEnd ISO string');

  console.log(`Fetching messages for Telegram chat: ${chatId}...`);
  
  // We fetch last 5000 messages to simulate a full export for this MVP
  const messages = await telegramClient.getMessages(chatId, {
    limit: 5000
  });

  let cleanTranscript = '';
  const participants = new Set<string>();
  let totalMessagesParsed = 0;

  for (let i = messages.length - 1; i >= 0; i--) { // Reverse to get chronological order
    const msg = messages[i];
    
    // GramJS message dates are usually unix timestamps in seconds
    const msgDate = new Date(msg.date * 1000);

    if (timeStart && msgDate < timeStart) continue;
    if (timeEnd && msgDate > timeEnd) continue;

    if (!msg.message || msg.message.trim() === '') continue;

    const timeString = `[${msgDate.getHours().toString().padStart(2, '0')}:${msgDate.getMinutes().toString().padStart(2, '0')}]`;
    
    let sender = 'Unknown';
    if (msg.sender) {
        // GramJS sender can be a User or Chat object
        const anySender = msg.sender as any;
        sender = anySender.firstName 
            ? `${anySender.firstName} ${anySender.lastName || ''}`.trim() 
            : (anySender.title || 'Unknown');
    }

    cleanTranscript += `${timeString} ${sender}: ${msg.message}\n`;
    participants.add(sender);
    totalMessagesParsed++;
  }

  return {
    participantCount: participants.size,
    totalMessagesParsed,
    cleanTranscript: cleanTranscript.trim(),
  };
};
