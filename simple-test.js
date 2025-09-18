console.log('🧪 Simple Test Starting...');

// Test 1: Check if we can connect to Tally
console.log('Testing Tally connection...');

const http = require('http');

const testXML = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>List of Accounts</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

const req = http.request({
  hostname: 'localhost',
  port: 9000,
  path: '',
  method: 'POST',
  headers: {
    'Content-Length': Buffer.byteLength(testXML, 'utf16le'),
    'Content-Type': 'text/xml;charset=utf-16'
  }
}, (res) => {
  let data = '';
  res.setEncoding('utf16le')
    .on('data', (chunk) => {
      data += chunk.toString();
    })
    .on('end', () => {
      console.log('✅ Tally connection successful!');
      console.log(`📏 Response length: ${data.length} characters`);
      console.log('🎉 Ready to migrate data!');
    });
});

req.on('error', (error) => {
  console.error('❌ Tally connection failed:', error.message);
  console.error('Make sure Tally is running on localhost:9000 with XML Server enabled');
});

req.write(testXML, 'utf16le');
req.end();
