export type User = {
  id: string;
  name: string;
  email: string;
  xp: number;
  level: number;
};

export type Item = {
  id: string;
  name: string;
  category: string;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  merchant?: string | null;
  price?: number | null;
  currency: string;
  warrantyUntil?: string | null;
  location?: string | null;
  completenessScore: number;
  status: "ACTIVE" | "SOLD" | "BROKEN" | "ARCHIVED";
  documents?: Document[];
  loops?: Loop[];
  reminders?: Reminder[];
  missingFields?: string[];
};

export type Document = {
  id: string;
  type: string;
  fileName: string;
  filePath: string;
  mimeType: string;
};

export type Loop = {
  id: string;
  itemId?: string | null;
  title: string;
  description?: string | null;
  sourceType: "MANUAL" | "RECEIPT" | "MESSAGE" | "DOCUMENT" | "DEVICE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "BOSS";
  status: "OPEN" | "DONE" | "SNOOZED" | "ARCHIVED";
  dueDate?: string | null;
  reminderAt?: string | null;
  xpReward: number;
  item?: Item | null;
  reminders?: Reminder[];
};

export type Reminder = {
  id: string;
  title: string;
  message: string;
  remindAt: string;
  status: "ACTIVE" | "SENT" | "CANCELLED";
  item?: Item | null;
  loop?: Loop | null;
};

export type Dashboard = {
  user: User;
  openLoops: Loop[];
  warrantyReminders: Reminder[];
  incompleteItems: Item[];
  stats: {
    openLoopCount: number;
    incompleteItemCount: number;
    remindersSoonCount: number;
  };
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
