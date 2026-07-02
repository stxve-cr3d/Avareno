PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS "AffiliateClick";
DROP TABLE IF EXISTS "BillingInvoice";
DROP TABLE IF EXISTS "BillingEvent";
DROP TABLE IF EXISTS "ItemActivity";
DROP TABLE IF EXISTS "SmartHomeCommand";
DROP TABLE IF EXISTS "SmartHomeDevice";
DROP TABLE IF EXISTS "ConsentEvent";
DROP TABLE IF EXISTS "PrivacyAuditEvent";
DROP TABLE IF EXISTS "XpTransaction";
DROP TABLE IF EXISTS "Reminder";
DROP TABLE IF EXISTS "DeviceToken";
DROP TABLE IF EXISTS "Loop";
DROP TABLE IF EXISTS "RepairLog";
DROP TABLE IF EXISTS "Document";
DROP TABLE IF EXISTS "Item";
DROP TABLE IF EXISTS "SmartHomeConnection";
DROP TABLE IF EXISTS "PlanSubscription";
DROP TABLE IF EXISTS "HouseholdMember";
DROP TABLE IF EXISTS "Space";
DROP TABLE IF EXISTS "AffiliatePartner";
DROP TABLE IF EXISTS "Household";
DROP TABLE IF EXISTS "User";

CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "level" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);

CREATE TABLE "PrivacyAuditEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "provider" TEXT,
  "safeContext" TEXT,
  "createdAt" TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User" ("id")
);

CREATE INDEX "PrivacyAuditEvent_userId_createdAt_idx" ON "PrivacyAuditEvent" ("userId", "createdAt");

CREATE TABLE "ConsentEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "legalBasis" TEXT,
  "source" TEXT NOT NULL DEFAULT 'app',
  "createdAt" TEXT NOT NULL,
  "revokedAt" TEXT,
  FOREIGN KEY ("userId") REFERENCES "User" ("id")
);

CREATE INDEX "ConsentEvent_userId_createdAt_idx" ON "ConsentEvent" ("userId", "createdAt");

CREATE TABLE "Household" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'HOME',
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User" ("id")
);

CREATE TABLE "HouseholdMember" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "householdId" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "role" TEXT NOT NULL DEFAULT 'VIEWER',
  "status" TEXT NOT NULL DEFAULT 'INVITED',
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL
);

CREATE TABLE "Space" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "householdId" TEXT NOT NULL,
  "parentId" TEXT,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'ROOM',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("parentId") REFERENCES "Space" ("id") ON DELETE SET NULL
);

CREATE TABLE "AffiliatePartner" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "baseUrl" TEXT,
  "commissionNote" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);

CREATE TABLE "PlanSubscription" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "householdId" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'internal',
  "providerCustomerId" TEXT,
  "providerSubscriptionId" TEXT,
  "stripePriceId" TEXT,
  "billingInterval" TEXT,
  "planKey" TEXT NOT NULL DEFAULT 'free',
  "tier" TEXT NOT NULL DEFAULT 'FREE',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "itemLimit" INTEGER NOT NULL DEFAULT 30,
  "storageLimitMb" INTEGER NOT NULL DEFAULT 100,
  "currentPeriodStart" TEXT,
  "currentPeriodEnd" TEXT,
  "cancelAtPeriodEnd" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User" ("id"),
  FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE SET NULL
);

CREATE TABLE "BillingEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "receivedAt" TEXT NOT NULL,
  "processedAt" TEXT,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "safeError" TEXT,
  UNIQUE ("provider", "eventId")
);

CREATE TABLE "BillingInvoice" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'stripe',
  "providerInvoiceId" TEXT NOT NULL,
  "providerCustomerId" TEXT,
  "providerSubscriptionId" TEXT,
  "invoiceNumber" TEXT,
  "status" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'eur',
  "amountDue" INTEGER NOT NULL DEFAULT 0,
  "amountPaid" INTEGER NOT NULL DEFAULT 0,
  "amountRemaining" INTEGER NOT NULL DEFAULT 0,
  "periodStart" TEXT,
  "periodEnd" TEXT,
  "hostedInvoiceUrl" TEXT,
  "invoicePdfUrl" TEXT,
  "invoiceCreatedAt" TEXT,
  "finalizedAt" TEXT,
  "paidAt" TEXT,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  UNIQUE ("provider", "providerInvoiceId"),
  FOREIGN KEY ("userId") REFERENCES "User" ("id")
);

CREATE INDEX "BillingInvoice_userId_createdAt_idx" ON "BillingInvoice" ("userId", "invoiceCreatedAt");
CREATE INDEX "BillingInvoice_providerInvoiceId_idx" ON "BillingInvoice" ("provider", "providerInvoiceId");

CREATE TABLE "SmartHomeConnection" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "householdId" TEXT,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "lastSyncAt" TEXT,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User" ("id"),
  FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE SET NULL
);

CREATE TABLE "Item" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "householdId" TEXT,
  "spaceId" TEXT,
  "name" TEXT NOT NULL,
  "itemType" TEXT NOT NULL DEFAULT 'THING',
  "category" TEXT NOT NULL,
  "manufacturer" TEXT,
  "model" TEXT,
  "serialNumber" TEXT,
  "barcode" TEXT,
  "barcodeFormat" TEXT,
  "purchaseDate" TEXT,
  "merchant" TEXT,
  "price" REAL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "imageUrl" TEXT,
  "warrantyUntil" TEXT,
  "location" TEXT,
  "notes" TEXT,
  "manualUrl" TEXT,
  "driverUrl" TEXT,
  "softwareUrl" TEXT,
  "supportUrl" TEXT,
  "supportContact" TEXT,
  "reorderUrl" TEXT,
  "affiliateUrl" TEXT,
  "affiliateProvider" TEXT,
  "visibility" TEXT NOT NULL DEFAULT 'HOUSEHOLD',
  "completenessScore" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User" ("id"),
  FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE SET NULL,
  FOREIGN KEY ("spaceId") REFERENCES "Space" ("id") ON DELETE SET NULL
);

CREATE TABLE "Document" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "itemId" TEXT,
  "type" TEXT NOT NULL DEFAULT 'OTHER',
  "fileName" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "extractedText" TEXT,
  "extractedJson" TEXT,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User" ("id"),
  FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL
);

CREATE TABLE "RepairLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "problem" TEXT NOT NULL,
  "resolution" TEXT,
  "cost" REAL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User" ("id"),
  FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE
);

CREATE TABLE "Loop" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "itemId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "dueDate" TEXT,
  "reminderAt" TEXT,
  "xpReward" INTEGER NOT NULL DEFAULT 25,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User" ("id"),
  FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL
);

CREATE TABLE "Reminder" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "loopId" TEXT,
  "itemId" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "remindAt" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User" ("id"),
  FOREIGN KEY ("loopId") REFERENCES "Loop" ("id") ON DELETE SET NULL,
  FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL
);

CREATE TABLE "DeviceToken" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "pushToken" TEXT NOT NULL UNIQUE,
  "deviceName" TEXT,
  "lastSeenAt" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User" ("id")
);

CREATE TABLE "XpTransaction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "loopId" TEXT,
  "itemId" TEXT,
  "action" TEXT NOT NULL,
  "points" INTEGER NOT NULL,
  "createdAt" TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User" ("id"),
  FOREIGN KEY ("loopId") REFERENCES "Loop" ("id") ON DELETE SET NULL,
  FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL
);

CREATE TABLE "ItemActivity" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "itemId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "User" ("id")
);

CREATE TABLE "AffiliateClick" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "itemId" TEXT,
  "partnerSlug" TEXT,
  "targetUrl" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'ITEM_REORDER',
  "createdAt" TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User" ("id"),
  FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL
);

CREATE TABLE "SmartHomeDevice" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "householdId" TEXT,
  "connectionId" TEXT,
  "provider" TEXT NOT NULL,
  "providerDeviceId" TEXT NOT NULL,
  "itemId" TEXT,
  "name" TEXT NOT NULL,
  "roomName" TEXT,
  "deviceType" TEXT NOT NULL DEFAULT 'device',
  "capabilities" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ONLINE',
  "powerState" TEXT,
  "rawJson" TEXT,
  "lastSeenAt" TEXT,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User" ("id"),
  FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE SET NULL,
  FOREIGN KEY ("connectionId") REFERENCES "SmartHomeConnection" ("id") ON DELETE SET NULL,
  FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL
);

CREATE TABLE "SmartHomeCommand" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "command" TEXT NOT NULL,
  "payload" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SIMULATED',
  "result" TEXT,
  "createdAt" TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User" ("id"),
  FOREIGN KEY ("deviceId") REFERENCES "SmartHomeDevice" ("id") ON DELETE CASCADE
);
