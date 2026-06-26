export type User = {
  id: string;
  name: string;
  email: string;
  xp: number;
  level: number;
};

export type Item = {
  id: string;
  householdId?: string | null;
  spaceId?: string | null;
  name: string;
  itemType?: "THING" | "ELECTRONIC" | "FURNITURE" | "INFRASTRUCTURE" | "VEHICLE" | "COLLECTIBLE" | string;
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
  reorderUrl?: string | null;
  affiliateUrl?: string | null;
  affiliateProvider?: string | null;
  visibility?: "PRIVATE" | "HOUSEHOLD" | string;
  completenessScore: number;
  status: "ACTIVE" | "SOLD" | "BROKEN" | "ARCHIVED";
  household?: Household | null;
  space?: Space | null;
  activities?: ItemActivity[];
  smartHomeDevices?: SmartHomeDevice[];
  documents?: Document[];
  repairLogs?: RepairLog[];
  loops?: Loop[];
  reminders?: Reminder[];
  missingFields?: string[];
};

export type SmartHomeProvider = {
  id: string;
  name: string;
  mode: "LIVE" | "DEMO" | "PLANNED" | string;
  status: string;
  tokenConfigured: boolean;
  authNote: string;
};

export type SmartHomeDevice = {
  id: string;
  userId: string;
  householdId?: string | null;
  connectionId?: string | null;
  provider: string;
  providerDeviceId: string;
  itemId?: string | null;
  itemName?: string | null;
  itemImageUrl?: string | null;
  itemModel?: string | null;
  itemManufacturer?: string | null;
  name: string;
  roomName?: string | null;
  deviceType: string;
  capabilities: string[];
  status: string;
  powerState?: string | null;
  rawJson?: Record<string, string | number | boolean | string[] | null>;
  lastSeenAt?: string | null;
};

export type SmartHomeCommand = {
  id: string;
  userId: string;
  deviceId: string;
  deviceName?: string;
  command: string;
  payload?: string | null;
  status: string;
  result?: string | null;
  createdAt: string;
};

export type SmartHomeInsight = {
  id: string;
  type: string;
  deviceId?: string | null;
  itemId?: string | null;
  itemName?: string | null;
  title: string;
  subtitle: string;
  signal: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "BOSS" | string;
  actionType: "CREATE_PLAN" | "LINK_ITEM" | "DISCOVER_LOCAL" | string;
  cta: string;
  status: "READY" | "ACTIVE" | string;
  planTitle?: string;
  planNote?: string;
  dueInDays?: number;
  xpReward?: number;
  automation?: {
    trigger: string;
    action: string;
    outcome: string;
    nextRun?: string;
    channels?: string[];
  };
};

export type SmartHomePayload = {
  mode: "LIVE" | "DEMO" | string;
  providers: SmartHomeProvider[];
  devices: SmartHomeDevice[];
  commands: SmartHomeCommand[];
  insights: SmartHomeInsight[];
  quickActions: { id: string; label: string }[];
  localDiscovery: {
    mode: "LAN" | "DEMO" | string;
    enabled: boolean;
    note: string;
  };
  wow: {
    label: string;
    promise: string;
  };
};

export type LocalDiscoveryCandidate = {
  id: string;
  name: string;
  host: string;
  provider: string;
  deviceType: string;
  category?: "printer" | "hub" | "media" | "camera" | "storage" | "network" | "unknown" | string;
  roomName?: string | null;
  confidence: number;
  confidenceLabel?: string;
  signals: string[];
  capabilities: string[];
  identity?: {
    label: string;
    evidence?: string[];
  };
  connectHint?: string;
  recommendedAction?: string;
  manualCheck?: string;
  filterTags?: string[];
  matchedItemId?: string | null;
  matchedItemName?: string | null;
  matchedItemImageUrl?: string | null;
};

export type LocalDiscoveryPayload = {
  mode: "LAN" | "DEMO" | string;
  enabled: boolean;
  scannedAt: string;
  scope: string;
  target?: string;
  candidates: LocalDiscoveryCandidate[];
};

export type Household = {
  id: string;
  userId: string;
  name: string;
  type: string;
};

export type HouseholdMember = {
  id: string;
  householdId: string;
  userId?: string | null;
  email: string;
  name?: string | null;
  role: "OWNER" | "EDITOR" | "VIEWER" | string;
  status: "ACTIVE" | "INVITED" | string;
};

export type Space = {
  id: string;
  householdId: string;
  parentId?: string | null;
  name: string;
  type: "HOME" | "BUILDING" | "FLOOR" | "ROOM" | "ZONE" | "STORAGE" | string;
  sortOrder: number;
  itemCount?: number;
};

export type ItemActivity = {
  id: string;
  itemId: string;
  userId: string;
  type: string;
  message: string;
  createdAt: string;
};

export type RepairLog = {
  id: string;
  userId: string;
  itemId: string;
  date: string;
  problem: string;
  resolution?: string | null;
  cost?: number | null;
  status: "OPEN" | "WAITING" | "RESOLVED" | string;
  createdAt: string;
  updatedAt: string;
};

export type SupportDraftChecklistItem = {
  label: string;
  status: "ready" | "missing" | string;
  detail: string;
};

export type SupportDraftAttachment = {
  id: string;
  type: string;
  fileName: string;
  filePath?: string | null;
};

export type SupportDraftMissingInfo = {
  id: string;
  label: string;
  action: string;
};

export type SupportDraft = {
  to: string;
  subject: string;
  body: string;
  checklist: SupportDraftChecklistItem[];
  attachments: SupportDraftAttachment[];
  missingInfo: SupportDraftMissingInfo[];
  readyScore: number;
  issueSummary: string;
};

export type CaptureKind = "AUTO" | "RECEIPT" | "MESSAGE" | "DOCUMENT" | "ITEM" | "LOOP";

export type CaptureDropResult = {
  id: string;
  kind: CaptureKind | string;
  title: string;
  summary: string;
  route: string;
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
  status: "LOCAL_MATCH" | "FOUND" | "NOT_FOUND" | string;
  source?: string | null;
  item?: Item | null;
  product?: BarcodeLookupProduct | null;
  canCreate: boolean;
  message?: string;
};

export type SearchResultType = "ITEM" | "LOOP" | "DOCUMENT" | "REMINDER";

export type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  meta?: string | null;
  route: string;
  status?: string | null;
};

export type SearchPayload = {
  query: string;
  results: SearchResult[];
};

export type PlanSubscription = {
  id: string;
  userId: string;
  householdId?: string | null;
  tier: "FREE" | "PREMIUM" | "PRO" | string;
  status: "ACTIVE" | "PAST_DUE" | "CANCELLED" | string;
  itemLimit: number;
  storageLimitMb: number;
};

export type ProductStructure = {
  household: Household | null;
  spaces: Space[];
  members: HouseholdMember[];
  plan: PlanSubscription | null;
  usage: {
    items: number;
    itemLimit: number;
    isLimitReached: boolean;
  };
  itemTypes: { id: string; label: string; description: string }[];
  captureMethods: { id: string; label: string; status: string; promise: string }[];
  premiumFeatures: { id: string; label: string; free: boolean | string; premium: boolean }[];
  wowFeatures: { id: string; label: string; description: string }[];
  affiliateProgram: {
    status: string;
    partners: { id: string; name: string; slug: string; baseUrl?: string | null; commissionNote?: string | null }[];
    rules: string[];
  };
  sharing: {
    status: string;
    roles: string[];
    defaultVisibility: string;
  };
  smartHome: {
    status: string;
    connections: { id: string; provider: string; status: string; lastSyncAt?: string | null }[];
    targetProviders: string[];
  };
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
  kind?: "warranty" | "reminder";
  state?: "due_now" | "today" | "this_week" | "later" | "unscheduled";
  deepLink?: string;
  item?: Item | null;
  loop?: Loop | null;
};

export type Planner = {
  generatedAt: string;
  windowDays: number;
  nextBest?: Loop | null;
  overdue: Loop[];
  today: Loop[];
  upcoming: Loop[];
  unscheduled: Loop[];
  notifications: Reminder[];
  counts: {
    overdue: number;
    today: number;
    upcoming: number;
    unscheduled: number;
    totalOpen: number;
  };
  notificationCounts: {
    dueNow: number;
    today: number;
    thisWeek: number;
  };
};

export type NotificationsPayload = {
  items: Reminder[];
  counts: {
    dueNow: number;
    today: number;
    thisWeek: number;
    later: number;
  };
};

export type MobileBootstrap = {
  apiVersion: string;
  user: User;
  planner: Planner;
  structure: ProductStructure;
  notifications: NotificationsPayload["items"];
  recentItems: Item[];
  features: {
    pushRegistration: boolean;
    notificationActions: string[];
    planningActions: string[];
  };
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

export type HomeBinderReport = {
  generatedAt: string;
  household: Household | null;
  summary: {
    itemCount: number;
    totalValue: number;
    protectedCount: number;
    readiness: number;
    missingDataPoints: number;
  };
  spaces: { name: string; itemCount: number; value: number }[];
  items: Array<
    Item & {
      binderStatus: {
        hasProof: boolean;
        warrantyActive: boolean;
        warrantySoon: boolean;
        insuranceReady: boolean;
      };
    }
  >;
  wow: {
    label: string;
    promise: string;
  };
};

export type CommerceReport = {
  reorderableItems: Item[];
  clicks: { id: string; targetUrl: string; source: string; createdAt: string }[];
  partners: { id: string; name: string; slug: string; baseUrl?: string | null }[];
  summary: {
    reorderableCount: number;
    clickCount: number;
    partnerCount: number;
  };
};

export type AssistantAnswer = {
  intent: string;
  answer: string;
  confidence: number;
  cards: {
    kind: string;
    title: string;
    subtitle: string;
    meta: string;
    href: string;
    imageUrl?: string | null;
  }[];
  actions: string[];
};
