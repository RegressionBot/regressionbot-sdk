const assert = require('assert');
const { sanitizeFilename } = require('../dist/index');

// Tests
console.log('Testing sanitizeFilename...');

try {
    // Basic - alphanumeric and underscores allowed, spaces/hyphens are replaced
    assert.strictEqual(sanitizeFilename('simple'), 'simple');
    assert.strictEqual(sanitizeFilename('Simple_123'), 'Simple_123');
    assert.strictEqual(sanitizeFilename('Desktop-Chrome'), 'Desktop_Chrome');
    
    // Traversal
    assert.strictEqual(sanitizeFilename('../../etc/passwd'), '______etc_passwd');
    assert.strictEqual(sanitizeFilename('..\\..\\windows'), '______windows');
    
    // Special characters are replaced with underscore
    assert.strictEqual(sanitizeFilename('file.txt'), 'file_txt');
    assert.strictEqual(sanitizeFilename('.env'), '_env');
    
    // Windows forbidden characters
    assert.strictEqual(sanitizeFilename('file:name'), 'file_name');
    assert.strictEqual(sanitizeFilename('file?name'), 'file_name');
    assert.strictEqual(sanitizeFilename('file*name'), 'file_name');
    
    // Spaces are replaced
    assert.strictEqual(sanitizeFilename('Simple 123'), 'Simple_123');
    
    // Empty result handling
    assert.strictEqual(sanitizeFilename(''), 'unknown');
    assert.strictEqual(sanitizeFilename(null), 'unknown');
    assert.strictEqual(sanitizeFilename(undefined), 'unknown');
    
    console.log('All tests passed!');
} catch (e) {
    console.error('Test failed:', e);
    process.exit(1);
}
