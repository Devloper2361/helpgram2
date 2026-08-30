const http = require('http');

const data = JSON.stringify({
  email: 'worker15@helpgram.local',
  password: 'Worker@12345'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => { body += d; });
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Response Body: ${body}`);
  });
});

req.on('error', error => {
  console.error('Error:', error);
});

req.write(data);
req.end();
