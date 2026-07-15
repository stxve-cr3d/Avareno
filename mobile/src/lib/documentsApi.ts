import { api } from './api';
import type { Document } from './types';

/** Native file reference from expo-image-picker/expo-camera results.
    On web pass a real File/Blob instead. */
export type LocalFile = { uri: string; name: string; type: string };

/** Multipart upload. RN's FormData accepts {uri,name,type} objects in place of
    Blobs — the cast bridges the web typings. api() skips the JSON Content-Type
    for FormData bodies so the multipart boundary survives. */
export function uploadDocument(file: LocalFile | Blob, type = 'RECEIPT', itemId?: string) {
  const data = new FormData();
  data.append('file', file as Blob);
  data.append('type', type);
  if (itemId) {
    data.append('itemId', itemId);
  }
  return api<Document>('/api/documents/upload', { method: 'POST', body: data });
}

export function listDocuments() {
  return api<Document[]>('/api/documents');
}
