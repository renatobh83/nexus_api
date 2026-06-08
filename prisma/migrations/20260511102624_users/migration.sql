-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "lastLogout" TIMESTAMP(3),
ADD COLUMN     "lastOnline" TIMESTAMP(3),
ADD COLUMN     "passwordHash" TEXT;
