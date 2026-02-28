const assert = require('assert');

function sanitizeFilename(name) {
    if (!name) return 'unknown';
    // Allow only alphanumeric, space, underscore, hyphen.
    // Replace everything else with underscore.
    return name.replace(/[^a-zA-Z0-9_\- ]/g, '_');
}

// Tests
console.log('Testing sanitizeFilename...');

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

    console.log('All tests passed!');
} catch (e) {
    console.error('Test failed:', e);
    process.exit(1);
}
