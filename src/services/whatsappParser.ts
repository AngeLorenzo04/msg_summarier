import fs from 'fs';
import readline from 'readline';
import { parse, isValid, isWithinInterval, parseISO } from 'date-fns';
import { ParseResult } from '../types';

// Common WhatsApp date formats across different locales
const DATE_FORMATS = [
  'dd/MM/yyyy, HH:mm', // Italian standard
  'dd/MM/yy, HH:mm',
  'M/d/yy, h:mm a',    // US standard
  'MM/dd/yy, hh:mm a',
  'dd/MM/yyyy HH:mm',
  'dd.MM.yy, HH:mm',   // German
  'dd/MM/yyyy, HH.mm',
  'd/M/yy, HH:mm',
];

/**
 * Attempts to parse a date string using multiple common formats.
 */
function parseFlexibleDate(dateString: string): Date | null {
  for (const formatStr of DATE_FORMATS) {
    const parsedDate = parse(dateString, formatStr, new Date());
    if (isValid(parsedDate)) {
      return parsedDate;
    }
  }
  return null;
}

/**
 * Parses a WhatsApp chat export line by line.
 */
export async function parseWhatsAppChat(
  filePath: string,
  timeStartIso?: string,
  timeEndIso?: string
): Promise<ParseResult> {
  const timeStart = timeStartIso ? parseISO(timeStartIso) : null;
  const timeEnd = timeEndIso ? parseISO(timeEndIso) : null;
  
  if (timeStart && !isValid(timeStart)) {
    throw new Error('Invalid timeStart ISO string');
  }
  if (timeEnd && !isValid(timeEnd)) {
    throw new Error('Invalid timeEnd ISO string');
  }

  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const participants = new Set<string>();
  let totalMessagesParsed = 0;
  let cleanTranscript = '';

  // State for multiline messages
  let currentMessage: { date: Date | null; sender: string; text: string } | null = null;

  // Regex to match the start of a WhatsApp message
  const messageRegex = /^\[?(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}[\s,]+?\d{1,2}[:.]\d{1,2}(?:[:.]\d{1,2})?(?:\s?[aApP][mM])?)\]?\s*[-:]?\s*([^:]+):\s*(.*)/;
  const systemMessageRegex = /^\[?(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}[\s,]+?\d{1,2}[:.]\d{1,2}(?:[:.]\d{1,2})?(?:\s?[aApP][mM])?)\]?\s*[-:]?\s*([^:]+)$/;

  const flushCurrentMessage = () => {
    if (!currentMessage) return;

    // Filter media omitted
    const textLower = currentMessage.text.toLowerCase();
    if (textLower.includes('<media omitted>') || textLower.includes('<media omesso>')) {
      return;
    }

    // Filter by time window (if bounds are provided)
    if (currentMessage.date) {
      if (timeStart && currentMessage.date < timeStart) return;
      if (timeEnd && currentMessage.date > timeEnd) return;
    }

    // Filter system messages (usually no clear sender, or sender is a system string, but regex handles sender)
    // Add to transcript
    const timeString = currentMessage.date
      ? `[${currentMessage.date.getHours().toString().padStart(2, '0')}:${currentMessage.date.getMinutes().toString().padStart(2, '0')}]`
      : '[??:??]';
      
    cleanTranscript += `${timeString} ${currentMessage.sender}: ${currentMessage.text}\n`;
    participants.add(currentMessage.sender);
    totalMessagesParsed++;
  };

  for await (const line of rl) {
    const match = line.match(messageRegex);
    
    if (match) {
      // It's a new message
      flushCurrentMessage();
      
      const [_, dateStr, sender, text] = match;
      const parsedDate = parseFlexibleDate(dateStr.trim());
      
      currentMessage = {
        date: parsedDate,
        sender: sender.trim(),
        text: text.trim(),
      };
    } else {
      const sysMatch = line.match(systemMessageRegex);
      if (sysMatch) {
         // This is a system message like "01/10/26, 08:15 - I messaggi sono crittografati..."
         // We flush the previous message and ignore this one
         flushCurrentMessage();
         currentMessage = null;
      } else {
         // It's a multiline continuation of the current message
         if (currentMessage) {
           currentMessage.text += `\n${line}`;
         }
      }
    }
  }

  // Flush the last message
  flushCurrentMessage();

  return {
    participantCount: participants.size,
    totalMessagesParsed,
    cleanTranscript: cleanTranscript.trim(),
  };
}
