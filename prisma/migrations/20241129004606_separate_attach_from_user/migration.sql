/*
  Warnings:

  - You are about to drop the column `adminId` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_adminId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "adminId";

-- CreateTable
CREATE TABLE "Attach" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attach_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attach_userId_key" ON "Attach"("userId");

-- AddForeignKey
ALTER TABLE "Attach" ADD CONSTRAINT "Attach_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("email") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attach" ADD CONSTRAINT "Attach_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("email") ON DELETE RESTRICT ON UPDATE CASCADE;
