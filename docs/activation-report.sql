-- Content-free first-product activation report for the current SQLite MVP.
-- Output is aggregate only: no user id, email, product name, filename,
-- document content, barcode, note or raw payload is selected.
--
-- Activation A: at least one real product created.
-- Activation B: at least one non-Vault document linked to an owned product.

WITH first_product AS (
  SELECT userId, MIN(createdAt) AS firstProductAt
  FROM "Item"
  GROUP BY userId
),
first_document AS (
  SELECT "Document".userId, MIN("Document".createdAt) AS firstDocumentAt
  FROM "Document"
  JOIN "Item"
    ON "Item".id = "Document".itemId
   AND "Item".userId = "Document".userId
  WHERE "Document".vaultId IS NULL
  GROUP BY "Document".userId
),
activation AS (
  SELECT
    "User".id,
    CASE WHEN first_product.firstProductAt IS NOT NULL THEN 1 ELSE 0 END AS activationA,
    CASE WHEN first_document.firstDocumentAt IS NOT NULL THEN 1 ELSE 0 END AS activationB,
    CASE
      WHEN first_product.firstProductAt IS NULL THEN NULL
      ELSE MAX(0, ROUND((julianday(first_product.firstProductAt) - julianday("User".createdAt)) * 86400))
    END AS secondsToFirstProduct,
    CASE
      WHEN first_document.firstDocumentAt IS NULL THEN NULL
      ELSE MAX(0, ROUND((julianday(first_document.firstDocumentAt) - julianday("User".createdAt)) * 86400))
    END AS secondsToFirstDocument
  FROM "User"
  LEFT JOIN first_product ON first_product.userId = "User".id
  LEFT JOIN first_document ON first_document.userId = "User".id
)
SELECT
  COUNT(*) AS registeredUsers,
  SUM(activationA) AS activationAUsers,
  ROUND(100.0 * SUM(activationA) / NULLIF(COUNT(*), 0), 1) AS activationARatePct,
  SUM(activationB) AS activationBUsers,
  ROUND(100.0 * SUM(activationB) / NULLIF(COUNT(*), 0), 1) AS activationBRatePct,
  ROUND(AVG(secondsToFirstProduct), 1) AS avgSecondsToFirstProduct,
  ROUND(AVG(secondsToFirstDocument), 1) AS avgSecondsToFirstDocument
FROM activation;
