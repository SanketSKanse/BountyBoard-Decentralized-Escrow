-- CreateTable
CREATE TABLE "BountyMetadata" (
    "id" TEXT NOT NULL,
    "bountyId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BountyMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BountyMetadata_bountyId_key" ON "BountyMetadata"("bountyId");
