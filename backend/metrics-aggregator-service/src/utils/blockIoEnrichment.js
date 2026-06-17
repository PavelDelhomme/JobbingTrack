/**
 * Block I/O conteneur — cumuls lecture/écriture (comme iotop / docker stats BlockIO).
 * Ne pas confondre « 0 mesuré » et « champ absent » (monitoring-agent sans blkio).
 */

function firstFiniteBlockIoByte(...values) {
  for (const value of values) {
    if (value == null || value === '') continue;
    const number = Number(value);
    if (Number.isFinite(number) && number >= 0) return number;
  }
  return null;
}

function blockIoFromContainerPayload(container = {}) {
  const read = firstFiniteBlockIoByte(
    container.block_read_bytes,
    container.block_io_read_bytes,
    container.blkio_read_bytes,
    container.io_read_bytes,
    container.block_read,
    container.blkio_read,
  );
  const write = firstFiniteBlockIoByte(
    container.block_write_bytes,
    container.block_io_write_bytes,
    container.blkio_write_bytes,
    container.io_write_bytes,
    container.block_write,
    container.blkio_write,
  );
  if (read == null && write == null) return undefined;
  return {
    ...(read != null ? { read: Math.round(read) } : {}),
    ...(write != null ? { write: Math.round(write) } : {}),
  };
}

/**
 * Enrichit containersForDb avec les cumuls Block I/O Docker (`docker stats`).
 */
async function enrichContainersBlockIoFromDockerStats(
  containersForDb,
  dockerService,
  isJobbingTrackContainer,
) {
  if (!containersForDb || typeof containersForDb !== 'object') return containersForDb;

  const missingBlockIo = Object.entries(containersForDb).some(([name, data]) => {
    if (!isJobbingTrackContainer(name)) return false;
    const read = data?.blockIO?.read;
    const write = data?.blockIO?.write;
    return read == null && write == null;
  });
  if (!missingBlockIo) return containersForDb;

  const stats = await dockerService.getAllContainersStats();
  for (const stat of stats) {
    const name = stat.name;
    if (!name || !isJobbingTrackContainer(name)) continue;
    const read = stat.block_read;
    const write = stat.block_write;
    if (!Number.isFinite(read) && !Number.isFinite(write)) continue;

    const existing = containersForDb[name] || {};
    containersForDb[name] = {
      ...existing,
      blockIO: {
        ...(existing.blockIO || {}),
        read: Math.round(Number(read) || 0),
        write: Math.round(Number(write) || 0),
      },
    };
  }
  return containersForDb;
}

module.exports = {
  firstFiniteBlockIoByte,
  blockIoFromContainerPayload,
  enrichContainersBlockIoFromDockerStats,
};
