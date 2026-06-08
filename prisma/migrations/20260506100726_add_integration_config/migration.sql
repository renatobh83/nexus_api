-- AlterTable
ALTER TABLE "Tickets" ADD COLUMN     "external_ref_id" TEXT,
ADD COLUMN     "integration_source" TEXT;

-- CreateTable
CREATE TABLE "integration_configs" (
    "id" TEXT NOT NULL,
    "integrationName" TEXT NOT NULL,
    "clientId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integration_configs_integrationName_key" ON "integration_configs"("integrationName");
