-- This is an empty migration.
CREATE UNIQUE INDEX ticket_active_unique
ON "Tickets" ("contato")
WHERE status IN ('open', 'pending');