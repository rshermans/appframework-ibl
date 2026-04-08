-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topic" TEXT NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "step" TEXT NOT NULL DEFAULT 'step0',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProjectInteraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "stepId" TEXT NOT NULL,
    "stepLabel" TEXT NOT NULL,
    "userInput" TEXT NOT NULL,
    "aiOutput" TEXT NOT NULL,
    "mode" TEXT,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectInteraction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Project_stage_idx" ON "Project"("stage");

-- CreateIndex
CREATE INDEX "Project_step_idx" ON "Project"("step");

-- CreateIndex
CREATE INDEX "ProjectInteraction_projectId_idx" ON "ProjectInteraction"("projectId");

-- CreateIndex
CREATE INDEX "ProjectInteraction_stage_idx" ON "ProjectInteraction"("stage");

-- CreateIndex
CREATE INDEX "ProjectInteraction_stepId_idx" ON "ProjectInteraction"("stepId");
