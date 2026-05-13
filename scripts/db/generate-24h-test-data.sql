-- Script pour générer 48h de données de test pour le CPU système
-- Génère des données depuis il y a 48h jusqu'à maintenant
-- Les valeurs sont aléatoires mais réalistes basées sur les vraies données actuelles

-- Supprimer les anciennes données de test si nécessaire
-- DELETE FROM system_metrics WHERE timestamp < NOW() - INTERVAL '25 hours';

-- Récupérer les valeurs de référence depuis la dernière entrée
DO $$
DECLARE
    base_cpu_usage_percent NUMERIC;
    base_memory_usage_percent NUMERIC;
    base_memory_total_mb BIGINT;
    base_container_count INTEGER;
    base_cpu_cores INTEGER;
    start_time TIMESTAMP;
    loop_timestamp TIMESTAMP;
    interval_minutes INTERVAL := '1 minute';
    random_variation NUMERIC;
    generated_cpu NUMERIC;
    i INTEGER;
BEGIN
    -- Récupérer les valeurs de base depuis la dernière entrée (ou valeurs par défaut)
    SELECT
        COALESCE(cpu_usage_percent, 3.0),
        COALESCE(memory_usage_percent, 88.0),
        COALESCE(memory_total_mb, 48000),
        COALESCE(container_count, 21),
        COALESCE(cpu_cores, 16)
    INTO
        base_cpu_usage_percent,
        base_memory_usage_percent,
        base_memory_total_mb,
        base_container_count,
        base_cpu_cores
    FROM system_metrics
    ORDER BY timestamp DESC
    LIMIT 1;

    -- Si aucune donnée, utiliser des valeurs par défaut réalistes
    IF base_cpu_usage_percent IS NULL THEN
        base_cpu_usage_percent := 3.0;
        base_memory_usage_percent := 88.0;
        base_memory_total_mb := 48000;
        base_container_count := 21;
        base_cpu_cores := 16;
    END IF;

    -- Définir la plage temporelle : depuis 24h en arrière jusqu'à demain matin (pour préparer les données de test)
    -- On génère depuis hier jusqu'à maintenant + quelques heures pour avoir des données demain matin
    DECLARE
        tomorrow_morning TIMESTAMP;
    BEGIN
        start_time := NOW() - INTERVAL '24 hours';
        -- Générer jusqu'à 6h du matin demain (ou jusqu'à maintenant si on est déjà passé)
        tomorrow_morning := DATE_TRUNC('day', NOW() + INTERVAL '1 day') + INTERVAL '6 hours';
        IF tomorrow_morning < NOW() THEN
            tomorrow_morning := NOW() + INTERVAL '2 hours'; -- Au moins 2h de données supplémentaires
        END IF;
        loop_timestamp := start_time;

        RAISE NOTICE 'Génération de données depuis % jusqu''à % (environ 24-30 heures)', start_time, tomorrow_morning;
    RAISE NOTICE 'Valeurs de base: CPU=%, Memory=%, Cores=%',
        base_cpu_usage_percent, base_memory_usage_percent, base_cpu_cores;

    -- Générer une entrée toutes les minutes jusqu'à demain matin
    WHILE loop_timestamp <= tomorrow_morning LOOP
        -- Variation aléatoire entre -50% et +50% pour le CPU (mais toujours entre 0.5% et 50%)
        random_variation := (RANDOM() - 0.5) * 1.0; -- -0.5 à +0.5 (variation de 50%)
        generated_cpu := base_cpu_usage_percent * (1.0 + random_variation);

        -- Limiter le CPU entre 0.5% et 50% pour rester réaliste
        IF generated_cpu < 0.5 THEN
            generated_cpu := 0.5;
        ELSIF generated_cpu > 50.0 THEN
            generated_cpu := 50.0;
        END IF;

        -- Insérer la ligne de données
        INSERT INTO system_metrics (
            timestamp,
            cpu_usage_percent,
            cpu_cores,
            cpu_load_1,
            cpu_load_5,
            cpu_load_15,
            memory_total_mb,
            memory_used_mb,
            memory_free_mb,
            memory_usage_percent,
            disk_usage_percent,
            container_count,
            avg_response_time_ms,
            availability_percent,
            load_score,
            total_network_rx_bytes,
            total_network_tx_bytes,
            project_cpu_avg,
            project_memory_mb
        ) VALUES (
            loop_timestamp,
            generated_cpu,
            base_cpu_cores,
            -- Load averages approximatives basées sur le CPU
            generated_cpu * base_cpu_cores / 100.0 * (0.8 + RANDOM() * 0.4),
            generated_cpu * base_cpu_cores / 100.0 * (0.9 + RANDOM() * 0.2),
            generated_cpu * base_cpu_cores / 100.0 * (0.95 + RANDOM() * 0.1),
            base_memory_total_mb,
            -- Mémoire utilisée avec légère variation
            (base_memory_total_mb * base_memory_usage_percent / 100.0) * (0.98 + RANDOM() * 0.04)::INTEGER,
            base_memory_total_mb - (base_memory_total_mb * base_memory_usage_percent / 100.0) * (0.98 + RANDOM() * 0.04)::INTEGER,
            base_memory_usage_percent * (0.98 + RANDOM() * 0.04),
            30.0 + RANDOM() * 2.0, -- Disk usage entre 30% et 32%
            base_container_count,
            0.15 + RANDOM() * 0.1, -- Response time entre 0.15ms et 0.25ms
            95.0 + RANDOM() * 5.0, -- Availability entre 95% et 100%
            generated_cpu * 0.4 + base_memory_usage_percent * 0.3 + 10.0, -- Load score approximatif
            335000000 + RANDOM() * 1000000, -- Network RX
            5930000000 + RANDOM() * 10000000, -- Network TX
            generated_cpu * 0.05 + RANDOM() * 0.2, -- Project CPU (plus faible que système)
            1800 + RANDOM() * 200 -- Project memory entre 1800 et 2000 MB
        );

        -- Avancer d'une minute
        loop_timestamp := loop_timestamp + interval_minutes;
    END LOOP;

    RAISE NOTICE '✅ Génération terminée pour la période jusqu''à demain matin';
END $$;

-- Afficher un résumé
SELECT
    COUNT(*) as total_points,
    MIN(timestamp) as oldest,
    MAX(timestamp) as newest,
    AVG(cpu_usage_percent) as avg_cpu,
    MIN(cpu_usage_percent) as min_cpu,
    MAX(cpu_usage_percent) as max_cpu
FROM system_metrics
WHERE timestamp >= NOW() - INTERVAL '49 hours';
