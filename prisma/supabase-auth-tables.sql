-- IBL-AI: tabelas de autenticação (NextAuth) + colunas associadas, para Supabase/Postgres.
--
-- SEGURO E REPETÍVEL: só CRIA o que falta (IF NOT EXISTS). Não apaga nem altera dados existentes.
-- Gerado a partir de prisma/schema.prisma. Cole no Supabase → SQL Editor → Run.
-- (Alternativa equivalente: `npx prisma db push` com DATABASE_URL/DIRECT_URL apontados ao Supabase.)
--
-- Porque é preciso: a migração inicial (20260408155012_init) é SQLite e só cria Project e
-- ProjectInteraction. Sem as tabelas User/Account o login Google falha no callback com
-- "There is a problem with the server configuration".

CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "step" TEXT NOT NULL DEFAULT 'step0',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProjectInteraction" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "stepId" TEXT NOT NULL,
    "stepLabel" TEXT NOT NULL,
    "userInput" TEXT NOT NULL,
    "aiOutput" TEXT NOT NULL,
    "mode" TEXT,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "sessionId" TEXT,
    "metadata" JSONB,
    "cognitiveFeatures" JSONB,
    "affectiveFeatures" JSONB,
    "learningMetrics" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectInteraction_pkey" PRIMARY KEY ("id")
);

-- Colunas adicionadas depois da versão inicial (no-op se já existirem)
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "ProjectInteraction" ADD COLUMN IF NOT EXISTS "sessionId" TEXT;
ALTER TABLE "ProjectInteraction" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "ProjectInteraction" ADD COLUMN IF NOT EXISTS "cognitiveFeatures" JSONB;
ALTER TABLE "ProjectInteraction" ADD COLUMN IF NOT EXISTS "affectiveFeatures" JSONB;
ALTER TABLE "ProjectInteraction" ADD COLUMN IF NOT EXISTS "learningMetrics" JSONB;
ALTER TABLE "ProjectInteraction" ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "Project_stage_idx" ON "Project"("stage");
CREATE INDEX IF NOT EXISTS "Project_step_idx" ON "Project"("step");
CREATE INDEX IF NOT EXISTS "Project_userId_idx" ON "Project"("userId");
CREATE INDEX IF NOT EXISTS "ProjectInteraction_projectId_idx" ON "ProjectInteraction"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectInteraction_stage_idx" ON "ProjectInteraction"("stage");
CREATE INDEX IF NOT EXISTS "ProjectInteraction_stepId_idx" ON "ProjectInteraction"("stepId");
CREATE INDEX IF NOT EXISTS "ProjectInteraction_sessionId_idx" ON "ProjectInteraction"("sessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Project_userId_fkey') THEN
    ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectInteraction_projectId_fkey') THEN
    ALTER TABLE "ProjectInteraction" ADD CONSTRAINT "ProjectInteraction_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Account_userId_fkey') THEN
    ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Session_userId_fkey') THEN
    ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
