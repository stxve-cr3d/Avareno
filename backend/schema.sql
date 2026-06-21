PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS "XpTransaction";
DROP TABLE IF EXISTS "Reminder";
DROP TABLE IF EXISTS "Loop";
DROP TABLE IF EXISTS "Document";
DROP TABLE IF EXISTS "Item";
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

CREATE TABLE "Item" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "manufacturer" TEXT,
  "model" TEXT,
  "serialNumber" TEXT,
  "purchaseDate" TEXT,
  "merchant" TEXT,
  "price" REAL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "warrantyUntil" TEXT,
  "location" TEXT,
  "completenessScore" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User" ("id")
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
