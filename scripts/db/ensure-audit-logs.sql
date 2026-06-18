-- Table audit_logs (B7 security-service) — migration ciblée non destructive
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorUserId" VARCHAR(100),
  "actorEmail" VARCHAR(255),
  "actorRole" VARCHAR(50),
  "action" VARCHAR(100) NOT NULL,
  "resource" VARCHAR(100) NOT NULL,
  "resourceId" VARCHAR(200),
  "outcome" VARCHAR(20) NOT NULL DEFAULT 'success',
  "clientIp" VARCHAR(45),
  "userAgent" TEXT,
  "requestId" VARCHAR(128),
  "metadata" JSONB,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "audit_logs_timestamp_idx" ON "audit_logs"("timestamp" DESC);
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "audit_logs_actorUserId_idx" ON "audit_logs"("actorUserId");
