const assert = require('assert');

function sanitizeFilename(name) {
    if (!name) return 'unknown';
    // Allow only alphanumeric, space, underscore, hyphen.
    // Replace everything else with underscore.
    return name.replace(/[^a-zA-Z0-9_\- ]/g, '_');
}

// Tests
console.log('Testing sanitizeFilename...');

const { sanitizeUrlToPath } = require('../dist/index.js');

try {
    // Basic
    assert.strictEqual(sanitizeFilename('simple'), 'simple');
    assert.strictEqual(sanitizeFilename('Simple 123'), 'Simple 123');
    assert.strictEqual(sanitizeFilename('Desktop-Chrome'), 'Desktop-Chrome');

    // Traversal
    assert.strictEqual(sanitizeFilename('../../etc/passwd'), '______etc_passwd');
    assert.strictEqual(sanitizeFilename('..\\..\\windows'), '______windows');

    // Dots
    assert.strictEqual(sanitizeFilename('file.txt'), 'file_txt');
    assert.strictEqual(sanitizeFilename('.env'), '_env');

    // Windows forbidden
    assert.strictEqual(sanitizeFilename('file:name'), 'file_name');
    assert.strictEqual(sanitizeFilename('file?name'), 'file_name');
    assert.strictEqual(sanitizeFilename('file*name'), 'file_name');

    // Empty result handling (though regex returns ____ for ..)
    assert.strictEqual(sanitizeFilename(''), 'unknown');
    assert.strictEqual(sanitizeFilename(null), 'unknown');
    assert.strictEqual(sanitizeFilename(undefined), 'unknown');

    console.log('Testing sanitizeUrlToPath...');
    // Basic paths
    assert.strictEqual(sanitizeUrlToPath('https://example.com/api/v1/user'), 'api_v1_user');
    assert.strictEqual(sanitizeUrlToPath('https://example.com/'), 'root');

    // Path traversal in URLs
    assert.strictEqual(sanitizeUrlToPath('data:text/plain,..\\..\\..\\..\\..\\..\\..\\..\\etc\\passwd'), 'text_plain_________________________etc_passwd');
    assert.strictEqual(sanitizeUrlToPath('https://example.com/../../etc/passwd'), 'etc_passwd');
    assert.strictEqual(sanitizeUrlToPath('https://example.com/api/v1/user/1%2f..%2f..%2fetc%2fpasswd'), 'api_v1_user_1_______etc_passwd');
    assert.strictEqual(sanitizeUrlToPath('https://example.com/api/v1/user/1%5C..%5C..%5Cetc%5Cpasswd'), 'api_v1_user_1_______etc_passwd');

    // Fallback logic
    assert.strictEqual(sanitizeUrlToPath('invalid_url_string'), 'invalid_url_string');

    console.log('All tests passed!');
} catch (e) {
    console.error('Test failed:', e);
    process.exit(1);
}
