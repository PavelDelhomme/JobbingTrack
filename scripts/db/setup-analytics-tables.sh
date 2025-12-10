#!/bin/bash
# Script pour créer les tables analytics et synchroniser Prisma

set -e

echo "🔧 Création des tables analytics..."

# Créer les tables manuellement
docker exec -i jobbingtrack-postgres psql -U jobbingtrack -d jobbingtrack << 'SQL'
-- Table user_sessions
CREATE TABLE IF NOT EXISTS "user_sessions" (
  id TEXT PRIMARY KEY,
  "userId" TEXT,
  "sessionId" TEXT UNIQUE NOT NULL,
  "deviceId" TEXT,
  platform TEXT NOT NULL,
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "deviceModel" TEXT,
  "osName" TEXT,
  "osVersion" TEXT,
  "browserName" TEXT,
  "browserVersion" TEXT,
  "screenWidth" INTEGER,
  "screenHeight" INTEGER,
  language TEXT,
  timezone TEXT,
  "startTime" TIMESTAMP NOT NULL DEFAULT NOW(),
  "endTime" TIMESTAMP,
  duration INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "pageViews" INTEGER NOT NULL DEFAULT 0,
  actions INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "user_sessions_userId_idx" ON "user_sessions"("userId");
CREATE INDEX IF NOT EXISTS "user_sessions_sessionId_idx" ON "user_sessions"("sessionId");
CREATE INDEX IF NOT EXISTS "user_sessions_deviceId_idx" ON "user_sessions"("deviceId");
CREATE INDEX IF NOT EXISTS "user_sessions_startTime_idx" ON "user_sessions"("startTime");
CREATE INDEX IF NOT EXISTS "user_sessions_platform_idx" ON "user_sessions"(platform);
CREATE INDEX IF NOT EXISTS "user_sessions_isActive_idx" ON "user_sessions"("isActive");

-- Table device_infos
CREATE TABLE IF NOT EXISTS "device_infos" (
  id TEXT PRIMARY KEY,
  "userId" TEXT,
  "deviceId" TEXT UNIQUE NOT NULL,
  platform TEXT NOT NULL,
  "deviceModel" TEXT,
  "osName" TEXT,
  "osVersion" TEXT,
  "appVersion" TEXT,
  "screenWidth" INTEGER,
  "screenHeight" INTEGER,
  "screenDensity" DOUBLE PRECISION,
  language TEXT,
  timezone TEXT,
  "batteryLevel" INTEGER,
  "isCharging" BOOLEAN,
  "networkType" TEXT,
  "firstSeen" TIMESTAMP NOT NULL DEFAULT NOW(),
  "lastSeen" TIMESTAMP NOT NULL DEFAULT NOW(),
  "totalSessions" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "device_infos_userId_idx" ON "device_infos"("userId");
CREATE INDEX IF NOT EXISTS "device_infos_deviceId_idx" ON "device_infos"("deviceId");
CREATE INDEX IF NOT EXISTS "device_infos_platform_idx" ON "device_infos"(platform);

-- Table user_events
CREATE TABLE IF NOT EXISTS "user_events" (
  id TEXT PRIMARY KEY,
  "userId" TEXT,
  "sessionId" TEXT NOT NULL,
  "deviceId" TEXT,
  "eventType" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  category TEXT,
  "elementId" TEXT,
  "elementType" TEXT,
  "elementText" TEXT,
  page TEXT,
  properties JSONB,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  platform TEXT NOT NULL,
  "appVersion" TEXT
);

CREATE INDEX IF NOT EXISTS "user_events_userId_idx" ON "user_events"("userId");
CREATE INDEX IF NOT EXISTS "user_events_sessionId_idx" ON "user_events"("sessionId");
CREATE INDEX IF NOT EXISTS "user_events_eventType_idx" ON "user_events"("eventType");
CREATE INDEX IF NOT EXISTS "user_events_eventName_idx" ON "user_events"("eventName");
CREATE INDEX IF NOT EXISTS "user_events_timestamp_idx" ON "user_events"(timestamp);
CREATE INDEX IF NOT EXISTS "user_events_category_idx" ON "user_events"(category);

-- Table user_errors
CREATE TABLE IF NOT EXISTS "user_errors" (
  id TEXT PRIMARY KEY,
  "userId" TEXT,
  "sessionId" TEXT,
  "deviceId" TEXT,
  "errorType" TEXT NOT NULL,
  "errorName" TEXT NOT NULL,
  "errorMessage" TEXT NOT NULL,
  "stackTrace" TEXT,
  page TEXT,
  "userAgent" TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  platform TEXT NOT NULL,
  "appVersion" TEXT,
  severity TEXT NOT NULL DEFAULT 'error',
  resolved BOOLEAN NOT NULL DEFAULT false,
  properties JSONB
);

CREATE INDEX IF NOT EXISTS "user_errors_userId_idx" ON "user_errors"("userId");
CREATE INDEX IF NOT EXISTS "user_errors_sessionId_idx" ON "user_errors"("sessionId");
CREATE INDEX IF NOT EXISTS "user_errors_errorType_idx" ON "user_errors"("errorType");
CREATE INDEX IF NOT EXISTS "user_errors_severity_idx" ON "user_errors"(severity);
CREATE INDEX IF NOT EXISTS "user_errors_timestamp_idx" ON "user_errors"(timestamp);
CREATE INDEX IF NOT EXISTS "user_errors_resolved_idx" ON "user_errors"(resolved);

-- Table user_performances
CREATE TABLE IF NOT EXISTS "user_performances" (
  id TEXT PRIMARY KEY,
  "userId" TEXT,
  "sessionId" TEXT,
  "deviceId" TEXT,
  "metricType" TEXT NOT NULL,
  "metricName" TEXT NOT NULL,
  value DOUBLE PRECISION,
  duration INTEGER,
  "memoryUsage" DOUBLE PRECISION,
  "cpuUsage" DOUBLE PRECISION,
  "networkLatency" INTEGER,
  "networkType" TEXT,
  page TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  platform TEXT NOT NULL,
  "appVersion" TEXT
);

CREATE INDEX IF NOT EXISTS "user_performances_userId_idx" ON "user_performances"("userId");
CREATE INDEX IF NOT EXISTS "user_performances_sessionId_idx" ON "user_performances"("sessionId");
CREATE INDEX IF NOT EXISTS "user_performances_metricType_idx" ON "user_performances"("metricType");
CREATE INDEX IF NOT EXISTS "user_performances_metricName_idx" ON "user_performances"("metricName");
CREATE INDEX IF NOT EXISTS "user_performances_timestamp_idx" ON "user_performances"(timestamp);

SELECT 'Tables analytics créées' as result;
SQL

echo "✅ Tables créées"
echo "🔄 Synchronisation Prisma..."

# Synchroniser Prisma avec la base de données
docker exec jobbingtrack-dashboard-service npx prisma db pull --force

echo "✅ Schéma Prisma synchronisé"
echo "🔄 Génération du Prisma Client..."

# Régénérer le Prisma Client
docker exec jobbingtrack-dashboard-service npx prisma generate

echo "✅ Prisma Client généré"
echo ""
echo "🎉 Tables analytics configurées avec succès !"

