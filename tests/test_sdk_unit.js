const assert = require('assert');
const { RegressionBot } = require('../dist/index');

// Mock fetch for testing
const originalFetch = global.fetch;
let mockFetchImpl = null;

function setMockFetch(fn) {
    mockFetchImpl = fn;
    global.fetch = fn;
}

function restoreFetch() {
    global.fetch = originalFetch;
    mockFetchImpl = null;
}

// Helper to create SDK with mock API
function createMockSdk() {
    const sdk = new RegressionBot('test-api-key', 'http://localhost:9999');
    return sdk;
}

async function testJobBuilderMethods() {
    console.log('Testing JobBuilder methods...');
    
    const sdk = createMockSdk();
    
    // Test basic chain
    console.log('  Testing basic chain...');
    const builder = sdk.test('https://preview.example.com')
        .forProject('test-project')
        .against('https://prod.example.com')
        .sitemap('https://prod.example.com/sitemap.xml')
        .on(['Desktop Chrome', 'iPhone 13'])
        .check('/', 'Homepage')
        .check('/about', 'About Page')
        .scan('/blog/**', { limit: 20 })
        .concurrency(5)
        .mask(['.ads', '#modal'])
        .autoApprove(true);
    
    // Test that methods return 'this' for chaining
    assert.strictEqual(builder instanceof Object, true);
    console.log('  OK: Chaining works');
    
    // Test run() with mock
    console.log('  Testing run()...');
    setMockFetch(async (url, options) => {
        assert.strictEqual(url, 'http://localhost:9999/crawl');
        assert.strictEqual(options.method, 'POST');
        
        const body = JSON.parse(options.body);
        assert.strictEqual(body.project, 'test-project');
        assert.strictEqual(body.testOrigin, 'https://preview.example.com');
        assert.strictEqual(body.baseOrigin, 'https://prod.example.com');
        assert.strictEqual(body.sitemapUrl, 'https://prod.example.com/sitemap.xml');
        assert.deepStrictEqual(body.devices, ['Desktop Chrome', 'iPhone 13']);
        assert.strictEqual(body.paths.length, 2);
        assert.strictEqual(body.paths[0].path, '/');
        assert.strictEqual(body.paths[0].label, 'Homepage');
        assert.strictEqual(body.scans.length, 1);
        assert.strictEqual(body.scans[0].pattern, '/blog/**');
        assert.strictEqual(body.scans[0].options.limit, 20);
        assert.strictEqual(body.concurrency, 5);
        assert.strictEqual(body.autoApprove, true);
        assert.deepStrictEqual(body.masks, ['.ads', '#modal']);
        
        return {
            ok: true,
            json: async () => ({ jobId: 'job-123' })
        };
    });
    
    const job = await builder.run();
    assert.strictEqual(job.jobId, 'job-123');
    console.log('  OK: run() returns JobHandle with correct jobId');
    
    restoreFetch();
    console.log('All JobBuilder tests passed!\n');
}

async function testJobHandleMethods() {
    console.log('Testing JobHandle methods...');
    
    const sdk = createMockSdk();
    const job = sdk.job('test-job-456');
    
    // Test getStatus()
    console.log('  Testing getStatus()...');
    setMockFetch(async (url) => {
        assert.strictEqual(url, 'http://localhost:9999/job/test-job-456');
        return {
            ok: true,
            json: async () => ({ 
                jobId: 'test-job-456', 
                status: 'COMPLETED',
                progress: { total: 10, completed: 10, percent: '100' }
            })
        };
    });
    
    const status = await job.getStatus();
    assert.strictEqual(status.jobId, 'test-job-456');
    assert.strictEqual(status.status, 'COMPLETED');
    console.log('  OK: getStatus() works');
    restoreFetch();
    
    // Test getSummary()
    console.log('  Testing getSummary()...');
    setMockFetch(async (url) => {
        assert.strictEqual(url, 'http://localhost:9999/job/test-job-456/summary');
        return {
            ok: true,
            json: async () => ({ 
                jobId: 'test-job-456',
                status: 'COMPLETED',
                overallScore: 95,
                regressionCount: 1,
                matchCount: 9
            })
        };
    });
    
    const summary = await job.getSummary();
    assert.strictEqual(summary.jobId, 'test-job-456');
    assert.strictEqual(summary.overallScore, 95);
    console.log('  OK: getSummary() works');
    restoreFetch();
    
    // Test approve()
    console.log('  Testing approve()...');
    setMockFetch(async (url, options) => {
        assert.strictEqual(url, 'http://localhost:9999/approve');
        assert.strictEqual(options.method, 'POST');
        const body = JSON.parse(options.body);
        assert.strictEqual(body.jobId, 'test-job-456');
        return {
            ok: true,
            json: async () => ({ 
                message: 'Approved',
                jobId: 'test-job-456',
                approvedUrlsCount: 5
            })
        };
    });
    
    const approveResult = await job.approve();
    assert.strictEqual(approveResult.approvedUrlsCount, 5);
    console.log('  OK: approve() works');
    restoreFetch();

    // Test generateAiSummary()
    console.log('  Testing generateAiSummary()...');
    setMockFetch(async (url, options) => {
        assert.strictEqual(url, 'http://localhost:9999/job/test-job-456/ai-summary');
        assert.strictEqual(options.method, 'POST');
        return {
            ok: true,
            json: async () => ({ 
                message: 'AI summary generated successfully',
                jobId: 'test-job-456',
                summaries: [{ url: 'https://example.com', variantName: 'desktop', regressionbotSummary: 'Header changed color' }]
            })
        };
    });
    const aiSummary = await job.generateAiSummary();
    assert.strictEqual(aiSummary.summaries[0].regressionbotSummary, 'Header changed color');
    console.log('  OK: generateAiSummary() works');
    restoreFetch();

    console.log('All JobHandle tests passed!\n');
}

async function testValidation() {
    console.log('Testing validation...');
    
    const sdk = createMockSdk();
    
    // Test that run() requires project or against
    console.log('  Testing validation: project/against required...');
    try {
        const builder = sdk.test('https://example.com');
        await builder.run();
        assert.fail('Should have thrown an error');
    } catch (e) {
        assert.ok(e.message.includes('Project ID is required'));
        console.log('  OK: Throws error when project/against missing');
    }
    
    // Test that default check is added when no checks/scans
    console.log('  Testing default check added...');
    setMockFetch(async (url, options) => {
        const body = JSON.parse(options.body);
        assert.strictEqual(body.paths.length, 1);
        assert.strictEqual(body.paths[0].path, '/');
        assert.strictEqual(body.paths[0].label, 'Home');
        return {
            ok: true,
            json: async () => ({ jobId: 'job-default' })
        };
    });
    
    const job = await sdk.test('https://example.com').forProject('test').run();
    assert.strictEqual(job.jobId, 'job-default');
    console.log('  OK: Default check added when no checks/scans');
    restoreFetch();
    
    console.log('All validation tests passed!\n');
}

async function testViewports() {
    console.log('Testing Viewports constant...');
    
    const { Viewports } = require('../dist/index');
    
    assert.strictEqual(Viewports.DESKTOP.width, 1920);
    assert.strictEqual(Viewports.DESKTOP.height, 1080);
    assert.strictEqual(Viewports.LAPTOP.width, 1366);
    assert.strictEqual(Viewports.LAPTOP.height, 768);
    assert.strictEqual(Viewports.TABLET.width, 768);
    assert.strictEqual(Viewports.TABLET.height, 1024);
    assert.strictEqual(Viewports.MOBILE.width, 375);
    assert.strictEqual(Viewports.MOBILE.height, 667);
    
    console.log('All Viewports tests passed!\n');
}

async function testProjectMethods() {
    console.log('Testing Project methods...');

    const sdk = createMockSdk();

    // Test getProject()
    console.log('  Testing getProject()...');
    setMockFetch(async (url) => {
        assert.strictEqual(url, 'http://localhost:9999/project/my-project');
        return {
            ok: true,
            json: async () => ({ name: 'my-project', testOrigin: 'https://example.com' })
        };
    });
    const project = await sdk.getProject('my-project');
    assert.strictEqual(project.name, 'my-project');
    console.log('  OK: getProject() works');
    restoreFetch();

    // Test listProjects()
    console.log('  Testing listProjects()...');
    setMockFetch(async (url) => {
        assert.strictEqual(url, 'http://localhost:9999/projects');
        return {
            ok: true,
            json: async () => ([{ name: 'my-project' }])
        };
    });
    const projectList = await sdk.listProjects();
    assert.strictEqual(projectList[0].name, 'my-project');
    console.log('  OK: listProjects() works');
    restoreFetch();

    // Test runProject()
    console.log('  Testing runProject()...');
    setMockFetch(async (url, options) => {
        assert.strictEqual(url, 'http://localhost:9999/project/my-project/run');
        assert.strictEqual(options.method, 'POST');
        assert.deepStrictEqual(JSON.parse(options.body), { autoApprove: true, concurrency: 5 });
        return {
            ok: true,
            json: async () => ({ jobId: 'job-project-123' })
        };
    });
    const job = await sdk.runProject('my-project', { autoApprove: true, concurrency: 5 });
    assert.strictEqual(job.jobId, 'job-project-123');
    console.log('  OK: runProject() works');
    restoreFetch();

    console.log('All Project tests passed!\n');
}

async function runAllTests() {
    try {
        await testJobBuilderMethods();
        await testJobHandleMethods();
        await testProjectMethods();
        await testValidation();
        await testViewports();
        console.log('✅ ALL SDK UNIT TESTS PASSED');
    } catch (err) {
        console.error('❌ SDK UNIT TESTS FAILED');
        console.error(err);
        process.exit(1);
    }
}

runAllTests();
