import { api } from './api';
import type { CaptureDropResult, CaptureKind, ExtractedReceipt, Loop, UniversalCaptureDraft } from './types';

/** Quick capture: backend classifies the text (ITEM/RECEIPT/MESSAGE/LOOP)
    and persists the matching record. POST /api/capture/drop */
export function captureDrop(text: string, kind: CaptureKind = 'AUTO', contactName?: string) {
  return api<CaptureDropResult>('/api/capture/drop', {
    method: 'POST',
    body: JSON.stringify({ text, kind, contactName }),
  });
}

/** Draft preview without persisting — returns a draft item plus confidence
    and missing fields. POST /api/capture/universal */
export function captureUniversal(input: {
  text: string;
  inputType?: 'TEXT' | 'PHOTO' | 'VOICE' | string;
  itemType?: string;
  spaceId?: string;
}) {
  return api<UniversalCaptureDraft>('/api/capture/universal', {
    method: 'POST',
    body: JSON.stringify({ inputType: 'TEXT', ...input }),
  });
}

export type CaptureMessageResult = {
  parsed: { title: string; reminderAt: string; dueDate?: string | null };
  loop: Loop;
  reminder: { id: string; title: string; remindAt: string };
};

/** Message reminder from pasted text (e.g. WhatsApp). POST /api/capture/message */
export function captureMessage(text: string, contactName?: string) {
  return api<CaptureMessageResult>('/api/capture/message', {
    method: 'POST',
    body: JSON.stringify({ text, contactName }),
  });
}

/** Receipt OCR/extraction — pass an uploaded documentId, or raw text/fileName
    without upload. Costs one AI action (PlanLimitError on 402).
    POST /api/extract/receipt */
export function extractReceipt(input: { documentId?: string; fileName?: string; text?: string }) {
  return api<ExtractedReceipt>('/api/extract/receipt', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
