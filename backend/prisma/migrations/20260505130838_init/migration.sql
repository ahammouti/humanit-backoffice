-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'tresorier', 'benevole');

-- CreateEnum
CREATE TYPE "DonorStatus" AS ENUM ('ACTIF', 'RETARD', 'ARRETE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('helloasso', 'virement');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Paye', 'Refuse', 'En_attente');

-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('helloasso', 'virement', 'manuel');

-- CreateEnum
CREATE TYPE "EnvoiStatus" AS ENUM ('planifie', 'envoye', 'en_cours');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'benevole',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Pole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donor" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "poleId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "lastPayment" TIMESTAMP(3),
    "status" "DonorStatus" NOT NULL DEFAULT 'ACTIF',
    "delayMonths" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "notes" TEXT,
    "lastContactDate" TIMESTAMP(3),
    "lastContactResult" TEXT,
    "helloassoMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "donorId" TEXT NOT NULL,
    "poleId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "source" "PaymentSource" NOT NULL,
    "reference" TEXT,
    "helloassoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relance" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "Relance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Envoi" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "status" "EnvoiStatus" NOT NULL DEFAULT 'planifie',
    "reference" TEXT,
    "fraisPct" DOUBLE PRECISION,
    "exchangeRate" DOUBLE PRECISION,
    "note" TEXT,
    "remitlyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Envoi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvoiItem" (
    "id" TEXT NOT NULL,
    "envoiId" TEXT NOT NULL,
    "emoji" TEXT,
    "label" TEXT NOT NULL,
    "eur" DOUBLE PRECISION NOT NULL,
    "fcfa" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "EnvoiItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "details" TEXT,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Pole_name_key" ON "Pole"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Donor_email_key" ON "Donor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Donor_helloassoMemberId_key" ON "Donor"("helloassoMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_helloassoId_key" ON "Payment"("helloassoId");

-- CreateIndex
CREATE UNIQUE INDEX "Envoi_remitlyId_key" ON "Envoi"("remitlyId");

-- AddForeignKey
ALTER TABLE "Donor" ADD CONSTRAINT "Donor_poleId_fkey" FOREIGN KEY ("poleId") REFERENCES "Pole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_poleId_fkey" FOREIGN KEY ("poleId") REFERENCES "Pole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relance" ADD CONSTRAINT "Relance_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvoiItem" ADD CONSTRAINT "EnvoiItem_envoiId_fkey" FOREIGN KEY ("envoiId") REFERENCES "Envoi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
