export interface ParseRequest {
  taskId: string;
  userId: string;
  platform: 'whatsapp' | 'telegram';
  timeStart?: string; // ISO 8601, opzionale
  timeEnd?: string;   // ISO 8601, opzionale
}

export interface AutoParseRequest extends ParseRequest {
  chatId: string;
}

export interface ChatMetadata {
  id: string;
  name: string;
}

export interface ParseResult {
  participantCount: number;
  totalMessagesParsed: number;
  cleanTranscript: string;
}

export interface WebhookPayload {
  task_id: string;
  user_id: string;
  platform: 'whatsapp' | 'telegram';
  status: 'success' | 'error';
  error_message?: string;
  metadata?: {
    participant_count: number;
    total_messages_parsed: number;
  };
  payload?: {
    clean_transcript: string;
  };
}
