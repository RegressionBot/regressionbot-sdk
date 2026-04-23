const assert = require('assert');
const { Visual } = require('../dist/index');
const http = require('http');

async function testApiIntegration() {
    console.log('Testing API integration (mock server)...');

    const mockApiKey = 'test-api-key';
    const server = http.createServer((req, res) => {
        // Verify headers
        assert.strictEqual(req.headers['x-api-key'], mockApiKey);
        assert.strictEqual(req.headers['content-type'], 'application/json');

        if (req.url === '/crawl' && req.method === 'POST') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ jobId: 'job-123' }));
        } else if (req.url === '/job/job-123' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'COMPLETED' }));
        } else if (req.url === '/redirect-me' && req.method === 'GET') {
            res.writeHead(302, { 'Location': 'http://localhost:3001/other' });
            res.end();
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    const port = 3001;
    server.listen(port);

    try {
        const sdk = new Visual(mockApiKey, `http://localhost:${port}`);
        
        // Test POST /crawl
        console.log('  Testing .test().on().against().run()...');
        const handle = await sdk.test('http://example.com').on(['desktop']).against('http://base.com').run();
        assert.strictEqual(handle.jobId, 'job-123');
        console.log('  OK: .run() returned handle');

        // Test GET /job/:id
        console.log('  Testing .getStatus()...');
        const status = await handle.getStatus();
        assert.strictEqual(status.status, 'COMPLETED');
        console.log('  OK: .getStatus() returned COMPLETED');

        // Test redirect: 'error'
        console.log('  Testing redirect handling...');
        try {
            await sdk._request('/redirect-me');
            assert.fail('Redirect should have thrown an error');
        } catch (e) {
            // Node-fetch / native fetch in node might throw "fetch failed" or similar for redirect: error
            assert.ok(e.message.toLowerCase().includes('redirect') || e.message.toLowerCase().includes('fetch failed'), `Expected redirect error, got: ${e.message}`);
            console.log('  OK: Redirect correctly threw an error');
        }

        // Test timeout (simulated hang)
        console.log('  Testing timeout...');
        const slowServer = http.createServer((req, res) => {
            // Never responds
        });
        const slowPort = 3002;
        slowServer.listen(slowPort);
        
        const slowSdk = new Visual(mockApiKey, `http://localhost:${slowPort}`);
        const start = Date.now();
        try {
            await slowSdk._request('/hang');
            assert.fail('Request should have timed out');
        } catch (e) {
            const duration = Date.now() - start;
            assert.ok(duration >= 9000 && duration <= 12000, `Timeout should be around 10s, but was ${duration}ms`);
            assert.ok(e.name === 'AbortError' || e.name === 'TimeoutError' || e.message.includes('abort'), `Expected AbortError or TimeoutError, got: ${e.name} - ${e.message}`);
            console.log(`  OK: Request timed out correctly in ${duration}ms`);
        }
        slowServer.close();

        // Test API Key redaction in error messages
        console.log('  Testing API Key redaction...');
        const errorServer = http.createServer((req, res) => {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`Internal Error: ${mockApiKey} is not working`);
        });
        const errorPort = 3003;
        errorServer.listen(errorPort);

        const errorSdk = new Visual(mockApiKey, `http://localhost:${errorPort}`);
        try {
            await errorSdk._request('/error');
            assert.fail('Request should have failed');
        } catch (e) {
            assert.ok(!e.message.includes(mockApiKey), 'Error message should not contain the API key');
            assert.ok(e.message.includes('***REDACTED***'), 'Error message should contain ***REDACTED***');
            console.log('  OK: API Key redacted from error message');
        }
        errorServer.close();

        console.log('All API integration tests passed!');
    } finally {
        server.close();
    }
}

testApiIntegration().catch(err => {
    console.error('API Integration Test Failed:', err);
    process.exit(1);
});
