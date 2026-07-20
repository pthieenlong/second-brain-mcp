-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tag" TEXT NOT NULL DEFAULT '',
    "filePath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Note_filePath_key" ON "Note"("filePath");

-- CreateIndex
CREATE INDEX "Note_category_createdAt_idx" ON "Note"("category", "createdAt");

-- CreateIndex
CREATE INDEX "Note_createdAt_idx" ON "Note"("createdAt");
