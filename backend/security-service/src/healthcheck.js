const http = require('http');

const port = process.env.PORT || 3017;
const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
  res.resume();
  process.exit(res.statusCode === 200 ? 0 : 1);
});
req.on('error', () => process.exit(1));
req.setTimeout(2500, () => {
  req.destroy();
  process.exit(1);
});
