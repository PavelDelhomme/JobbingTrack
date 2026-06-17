function readThreatMetadata(threat) {
  if (!threat || typeof threat !== 'object') return {};
  const meta = threat.metadata;
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    return meta;
  }
  return {};
}

function isThreatIgnored(threat) {
  return readThreatMetadata(threat).ignored === true;
}

/** Clause Prisma : menaces non ignorées (faux positifs exclus des compteurs par défaut). */
function activeThreatWhereClause() {
  return {
    NOT: {
      metadata: {
        path: ['ignored'],
        equals: true,
      },
    },
  };
}

function mergeThreatMetadata(threat, patch) {
  const prev = readThreatMetadata(threat);
  return { ...prev, ...patch };
}

module.exports = {
  isThreatIgnored,
  activeThreatWhereClause,
  mergeThreatMetadata,
  readThreatMetadata,
};
