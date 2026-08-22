-- Preflight: não associa configurações legadas a um cliente arbitrário.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "integration_configs"
    WHERE "clientId" IS NULL
  ) THEN
    RAISE EXCEPTION
      'Migração interrompida: existem configurações de integração sem clientId. Preencha clientId antes de aplicar esta migração.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "integration_configs"
    GROUP BY "integrationName", "clientId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Migração interrompida: existem configurações duplicadas para o mesmo integrationName e clientId.';
  END IF;
END $$;

-- Remove a unicidade global que impedia o mesmo tipo de integração em clientes diferentes.
DROP INDEX IF EXISTS "integration_configs_integrationName_key";

-- O modelo passa a exigir o escopo do cliente em todos os registros.
ALTER TABLE "integration_configs"
  ALTER COLUMN "clientId" SET NOT NULL;

-- Garante uma única configuração por integração dentro de cada cliente.
CREATE UNIQUE INDEX "integration_configs_integrationName_clientId_key"
  ON "integration_configs"("integrationName", "clientId");
