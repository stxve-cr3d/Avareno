/** Mirrors of the backend payloads the app consumes — trimmed to scalar fields
    plus what screens render; relation fields stay out until a screen needs them.
    Source of truth: backend/app/schemas.py + frontend/src/lib/types.ts. */

export type Document = {
  id: string;
  type: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  itemId?: string | null;
  extractedText?: string | null;
  extractedJson?: string | null;
  createdAt?: string | null;
};

export type Item = {
  id: string;
  householdId?: string | null;
  spaceId?: string | null;
  name: string;
  itemType?: 'THING' | 'ELECTRONIC' | 'FURNITURE' | 'INFRASTRUCTURE' | 'VEHICLE' | 'COLLECTIBLE' | string;
  category: string;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  barcode?: string | null;
  barcodeFormat?: string | null;
  purchaseDate?: string | null;
  merchant?: string | null;
  price?: number | null;
  currency: string;
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
  completenessScore: number;
  status: 'ACTIVE' | 'SOLD' | 'BROKEN' | 'ARCHIVED';
  createdAt?: string | null;
  updatedAt?: string | null;
  documents?: Document[];
  missingFields?: string[];
};

export type Loop = {
  id: string;
  itemId?: string | null;
  title: string;
  description?: string | null;
  sourceType: 'MANUAL' | 'RECEIPT' | 'MESSAGE' | 'DOCUMENT' | 'DEVICE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'BOSS';
  status: 'OPEN' | 'DONE' | 'SNOOZED' | 'ARCHIVED';
  dueDate?: string | null;
  reminderAt?: string | null;
  xpReward: number;
};

export type CaptureKind = 'AUTO' | 'ITEM' | 'RECEIPT' | 'MESSAGE' | 'LOOP' | 'DOCUMENT';

export type CaptureDropResult = {
  id: string;
  kind: CaptureKind | string;
  title: string;
  summary: string;
  /** Web route (e.g. /app/items/<id>) — map to a mobile route before navigating. */
  route: string;
};

export type UniversalCaptureDraft = {
  inputType: string;
  confidence: number;
  draftItem: Partial<Item> & {
    name: string;
    category: string;
    itemType: string;
    currency: string;
  };
  imageSuggestion?: {
    imageUrl: string;
    sourceName: string;
    sourceUrl: string;
  } | null;
  missing: string[];
  suggestedActions: string[];
};

export type BarcodeLookupProduct = {
  barcode: string;
  barcodeFormat: string;
  name?: string | null;
  category?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  imageUrl?: string | null;
  sourceName: string;
  sourceUrl?: string | null;
  confidence: number;
};

export type BarcodeLookup = {
  barcode: string;
  barcodeFormat: string;
  status: 'LOCAL_MATCH' | 'FOUND' | 'NOT_FOUND' | string;
  source?: string | null;
  item?: Item | null;
  product?: BarcodeLookupProduct | null;
  canCreate: boolean;
  message?: string;
};

export type ExtractedReceipt = {
  merchant: string;
  purchaseDate: string;
  itemName: string;
  category: string;
  manufacturer: string;
  model: string;
  price: number;
  currency: string;
  warrantyUntil: string;
  extractedText: string;
};

export type BootstrapUser = {
  id: string;
  email?: string | null;
  displayName?: string | null;
};

export type BootstrapNotification = {
  id: string;
  title?: string | null;
  message?: string | null;
  createdAt?: string | null;
};

export type MobileBootstrap = {
  apiVersion: string;
  user: BootstrapUser;
  notifications: BootstrapNotification[];
  recentItems: Item[];
  features: {
    pushRegistration: boolean;
    notificationActions: string[];
    planningActions: string[];
    smartHomeActions: string[];
  };
};
