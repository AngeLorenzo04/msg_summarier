import fs from 'fs';
import { parseISO, isValid } from 'date-fns';
import { ParseResult } from '../types';

import streamArray from 'stream-json/streamers/stream-array.js';
import { chain } from 'stream-chain';
import parser from 'stream-json/parser.js';
import pick from 'stream-json/filters/pick.js';

export async function parseTelegramChat(
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

  const participants = new Set<string>();
  let totalMessagesParsed = 0;
  let cleanTranscript = '';

  return new Promise((resolve, reject) => {
    const pipeline = chain([
      fs.createReadStream(filePath),
      parser(),
      pick({ filter: 'messages' }),
      streamArray()
    ]);

    pipeline.on('data', (data: any) => {
      const msg = data.value;
      
      // Filter out non-messages (like service messages: "phone_call", "pin_message", etc.)
      if (msg.type !== 'message' || !msg.from) {
        return;
      }

      // Filter by time
      if (msg.date) {
        const msgDate = parseISO(msg.date);
        if (isValid(msgDate)) {
          if (timeStart && msgDate < timeStart) return;
          if (timeEnd && msgDate > timeEnd) return;
        }
      }

      // Extract text. Telegram can store text as a string or an array of mixed strings/objects (for formatted text)
      let rawText = '';
      if (typeof msg.text === 'string') {
        rawText = msg.text;
      } else if (Array.isArray(msg.text)) {
        rawText = msg.text.map((part: any) => {
          if (typeof part === 'string') return part;
          if (part && part.text) return part.text;
          return '';
        }).join('');
      }

      const textLower = rawText.toLowerCase();
      // Optionally filter specific system messages or empty messages
      if (!rawText.trim()) return;
      if (textLower.includes('<media omitted>') || textLower.includes('<media omesso>')) return; // Just in case

      // Format time
      const dateObj = msg.date ? parseISO(msg.date) : null;
      const timeString = dateObj && isValid(dateObj)
        ? `[${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}]`
        : '[??:??]';

      cleanTranscript += `${timeString} ${msg.from}: ${rawText}\n`;
      participants.add(msg.from);
      totalMessagesParsed++;
    });

    pipeline.on('end', () => {
      resolve({
        participantCount: participants.size,
        totalMessagesParsed,
        cleanTranscript: cleanTranscript.trim(),
      });
    });

    pipeline.on('error', (err: any) => {
      reject(err);
    });
  });
}
