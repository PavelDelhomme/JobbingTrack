/**
 * Utilitaires pour gérer les erreurs Prisma P2021 (table manquante)
 * Utilisé dans tous les services pour retourner des données vides en mode développement
 */

const handlePrismaP2021 = (error, modelName, logger, defaultData = []) => {
  if (error.code === 'P2021' && process.env.NODE_ENV !== 'production') {
    const tableName = error.meta?.table || modelName;
    logger.warn(`Table ${tableName} non trouvée, retour de données vides (mode développement)`);
    return {
      data: defaultData,
      total: 0,
      warning: `Table ${tableName} non trouvée. Exécutez "make db-push-all" pour créer les tables.`
    };
  }
  throw error;
};

const wrapPrismaQuery = async (queryFn, modelName, logger, defaultData = []) => {
  try {
    return await queryFn();
  } catch (error) {
    return handlePrismaP2021(error, modelName, logger, defaultData);
  }
};

module.exports = {
  handlePrismaP2021,
  wrapPrismaQuery
};

