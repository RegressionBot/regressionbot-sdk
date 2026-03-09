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
        // Path traversal cases
        {
            input: 'https://example.com/..%5c..%5c..%5c..%5cetc%5cpasswd',
            expected: '___5c___5c___5c___5cetc_5cpasswd'
        },
        {
            input: 'data:text/plain,foo\\..\\..\\..\\..\\etc\\passwd',
            expected: 'text_plain_foo_____________etc_passwd'
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
