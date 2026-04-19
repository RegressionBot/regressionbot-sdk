const assert = require('assert');
const { sanitizeUrlToPath, sanitizeFilename } = require('../dist/index');

function testAdhocSanitization() {
    console.log('Testing sanitizeUrlToPath...');

    const cases = [
        { 
            input: 'https://techhacks.io/ai/google-jules-coding-agent-review', 
            expected: 'ai_google_jules_coding_agent_review' 
        },
        { 
            input: 'https://example.com/', 
            expected: 'root' 
        },
        { 
            input: 'https://example.com/blog-post', 
            expected: 'blog_post' 
        },
        { 
            input: 'https://example.com/deep/path/with/multiple/slashes/', 
            expected: 'deep_path_with_multiple_slashes' 
        },
        { 
            input: 'invalid-url', 
            expected: 'invalid_url' 
        },
        {
            input: 'mailto:..\\..\\etc\\passwd',
            expected: '______etc_passwd'
        },
        {
            input: 'data:text/html,../../../../etc/passwd',
            expected: 'text_html_____________etc_passwd'
        },
        {
            input: 'https://example.com/..%2f..%2f..%2fetc%2fpasswd',
            expected: '_________etc_passwd'
        },
        {
            input: 'https://example.com/%2e%2e/%2e%2e/%2e%2e/etc/passwd',
            expected: 'etc_passwd'
        },
        {
            input: 'https://example.com/..\\..\\..\\etc\\passwd',
            expected: 'etc_passwd'
        }
    ];

    for (const c of cases) {
        const result = sanitizeUrlToPath(c.input);
        console.log(`  Input: ${c.input} -> Result: ${result}`);
        assert.strictEqual(result, c.expected);
    }

    console.log('All adhoc tests passed!');
}

try {
    testAdhocSanitization();
} catch (e) {
    console.error('Test failed:', e);
    process.exit(1);
}
