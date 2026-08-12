-- CreateEnum
CREATE TYPE "PhaseStatus" AS ENUM ('PLANNED', 'ACTIVE', 'CLOSED');

-- CreateTable
CREATE TABLE "event_phases" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "endsAt" TIMESTAMP(3),
    "status" "PhaseStatus" NOT NULL DEFAULT 'PLANNED',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_recipients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);

-- Seed: fases iniciais
INSERT INTO "event_phases" ("id", "name", "description", "status", "order", "updatedAt")
VALUES
    ('phase_save_the_date', 'Save the Date', 'Convidados sinalizam se pretendem ir', 'ACTIVE', 0, CURRENT_TIMESTAMP),
    ('phase_convite_oficial', 'Convite oficial (RSVP)', 'Confirmação final de presença, com acompanhantes', 'PLANNED', 1, CURRENT_TIMESTAMP);
