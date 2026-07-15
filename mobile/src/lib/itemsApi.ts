import { api } from './api';
import type { BarcodeLookup, Item } from './types';

/** POST /api/items body — web parity (frontend CaptureItem/CaptureReceipt).
    documentId links an already-uploaded receipt to the new item. */
export type ItemCreateInput = {
  name: string;
  category?: string;
  itemType?: string;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  barcode?: string | null;
  barcodeFormat?: string | null;
  purchaseDate?: string | null;
  merchant?: string | null;
  price?: number | null;
  currency?: string;
  imageUrl?: string | null;
  warrantyUntil?: string | null;
  location?: string | null;
  notes?: string | null;
  manualUrl?: string | null;
  driverUrl?: string | null;
  softwareUrl?: string | null;
  supportUrl?: string | null;
  supportContact?: string | null;
  visibility?: 'PRIVATE' | 'HOUSEHOLD' | string;
  spaceId?: string | null;
  householdId?: string | null;
  documentId?: string | null;
};

export function listItems() {
  return api<Item[]>('/api/items');
}

export function getItem(itemId: string) {
  return api<Item>(`/api/items/${encodeURIComponent(itemId)}`);
}

export function createItem(input: ItemCreateInput) {
  return api<Item>('/api/items', {
    method: 'POST',
    body: JSON.stringify({ currency: 'EUR', visibility: 'HOUSEHOLD', ...input }),
  });
}

export function updateItem(itemId: string, patch: Partial<ItemCreateInput>) {
  return api<Item>(`/api/items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/** Scanned/typed barcode → local item match, external product data, or NOT_FOUND.
    GET /api/items/lookup/barcode */
export function lookupBarcode(code: string) {
  return api<BarcodeLookup>(`/api/items/lookup/barcode?code=${encodeURIComponent(code)}`);
}
