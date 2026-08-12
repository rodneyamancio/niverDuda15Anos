-- CreateEnum
CREATE TYPE "SaveTheDateStatus" AS ENUM ('PENDING', 'YES', 'NO');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('SAVE_THE_DATE', 'RSVP');

-- CreateTable
CREATE TABLE "guests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "token" TEXT NOT NULL,
    "saveTheDate" "SaveTheDateStatus" NOT NULL DEFAULT 'PENDING',
    "saveTheDateAt" TIMESTAMP(3),
    "rsvpStatus" "RsvpStatus" NOT NULL DEFAULT 'PENDING',
    "rsvpAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_logs" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "kind" "MessageKind" NOT NULL DEFAULT 'SAVE_THE_DATE',
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guests_token_key" ON "guests"("token");

-- AddForeignKey
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
