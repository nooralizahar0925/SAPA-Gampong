-- KK remains a valid legacy attachment kind for existing requests, but is no
-- longer required by any current letter template.
UPDATE "LetterTemplate"
SET
  "requiredAttachments" = array_remove("requiredAttachments", 'KK'),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE 'KK' = ANY("requiredAttachments");
