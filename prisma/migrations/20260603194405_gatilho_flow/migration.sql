-- AlterTable
ALTER TABLE "flows" ADD COLUMN     "gatilho" TEXT,
ADD COLUMN     "queueId" TEXT;

-- CreateTable
CREATE TABLE "FlowTrigger" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "evento" TEXT NOT NULL,
    "queueId" TEXT,

    CONSTRAINT "FlowTrigger_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FlowTrigger" ADD CONSTRAINT "FlowTrigger_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "flows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
