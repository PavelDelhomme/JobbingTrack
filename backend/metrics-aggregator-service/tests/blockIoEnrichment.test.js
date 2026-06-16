const {
  blockIoFromContainerPayload,
  enrichContainersBlockIoFromDockerStats,
  firstFiniteBlockIoByte,
} = require('../src/utils/blockIoEnrichment');

describe('blockIoEnrichment', () => {
  it('ne confond pas champ absent et zéro mesuré', () => {
    expect(blockIoFromContainerPayload({ cpu_percent: 1 })).toBeUndefined();
    expect(blockIoFromContainerPayload({ block_read_bytes: 0 })).toEqual({ read: 0 });
    expect(
      blockIoFromContainerPayload({ block_read: 1048576, block_write: 2048 }),
    ).toEqual({ read: 1048576, write: 2048 });
  });

  it('accepte les alias docker stats / agent', () => {
    expect(firstFiniteBlockIoByte(undefined, null, '', 512)).toBe(512);
    expect(
      blockIoFromContainerPayload({
        blkio_read_bytes: 100,
        io_write_bytes: 200,
      }),
    ).toEqual({ read: 100, write: 200 });
  });

  it('enrichit depuis docker stats sans écraser CPU/mémoire', async () => {
    const containersForDb = {
      'jobbingtrack-postgres': {
        cpu: { percentage: 2 },
        memory: { usage: 100 },
      },
    };
    const dockerService = {
      getAllContainersStats: async () => [
        {
          name: 'jobbingtrack-postgres',
          block_read: 454000000,
          block_write: 304000000,
        },
        { name: 'cloudity-api-gateway', block_read: 999, block_write: 999 },
      ],
    };
    await enrichContainersBlockIoFromDockerStats(
      containersForDb,
      dockerService,
      (name) => name.startsWith('jobbingtrack-'),
    );
    expect(containersForDb['jobbingtrack-postgres'].cpu.percentage).toBe(2);
    expect(containersForDb['jobbingtrack-postgres'].blockIO).toEqual({
      read: 454000000,
      write: 304000000,
    });
    expect(containersForDb['cloudity-api-gateway']).toBeUndefined();
  });
});
