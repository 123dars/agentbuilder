const http = require('http');

const data = JSON.stringify({
  type: 'export_metadata',
  args: {}
});

const options = {
  hostname: 'localhost',
  port: 1337,
  path: '/v1/metadata',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-hasura-admin-secret': 'nhost-admin-secret'
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log(body);
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.write(data);
req.end();
