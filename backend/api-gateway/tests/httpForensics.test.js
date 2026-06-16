const {
  buildHttpForensicsFromRequest,
  pickCentralLogForensics,
} = require('../../shared/utils/httpForensics');

describe('httpForensics', () => {
  const mockReq = {
    requestId: 'req-abc',
    correlationId: 'corr-abc',
    method: 'GET',
    originalUrl: '/api/v1/auth/me',
    protocol: 'http',
    socket: { localPort: 3000 },
    ip: '127.0.0.1',
    get: () => null,
  };

  it('buildHttpForensicsFromRequest inclut requestId, méthode, endpoint, proto, port', () => {
    const forensics = buildHttpForensicsFromRequest(mockReq, { httpStatus: 401 });
    expect(forensics.requestId).toBe('req-abc');
    expect(forensics.method).toBe('GET');
    expect(forensics.endpoint).toBe('/api/v1/auth/me');
    expect(forensics.protocol).toBe('http');
    expect(forensics.port).toBe(3000);
    expect(forensics.httpStatus).toBe(401);
    expect(forensics.clientIp).toBe('127.0.0.1');
  });

  it('pickCentralLogForensics fusionne info Winston et contexte requête', () => {
    const metadata = pickCentralLogForensics(
      { message: 'x', level: 'warn', endpoint: '/health' },
      { requestId: 'ctx-id', method: 'POST', port: 8080 },
    );
    expect(metadata.requestId).toBe('ctx-id');
    expect(metadata.method).toBe('POST');
    expect(metadata.endpoint).toBe('/health');
    expect(metadata.port).toBe(8080);
  });
});
