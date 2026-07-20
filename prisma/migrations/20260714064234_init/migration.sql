-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tag" TEXT[],
    "filePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Note_filePath_key" ON "Note"("filePath");

-- CreateIndex
CREATE INDEX "Note_category_createdAt_idx" ON "Note"("category", "createdAt");

-- CreateIndex
CREATE INDEX "Note_createdAt_idx" ON "Note"("createdAt");
