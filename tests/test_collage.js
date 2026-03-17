const { Visual } = require('../dist/index');

// Simple mock for jest.fn()
if (typeof jest === 'undefined') {
    global.jest = {
        fn: (impl) => {
            const fn = (...args) => {
                fn.mock.calls.push(args);
                return impl ? impl(...args) : undefined;
            };
            fn.mock = { calls: [] };
            return fn;
        }
    };
}

async function testCollage() {
    console.log("Testing getCollage()...");
    
    // Mock global fetch
    global.fetch = jest.fn(() =>
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                jobId: "test-job-id",
                collageKey: "test-org/collages/test-job-id/regressions.jpg",
                collageUrl: "https://signed-url.com/collage.jpg",
                regressionCount: 5
            }),
        })
    );

    const sdk = new Visual("test-key", "https://api.test.com");
    const job = sdk.job("test-job-id");
    
    const collage = await job.getCollage();
    
    console.log("Collage Response:", collage);
    
    if (collage.collageUrl === "https://signed-url.com/collage.jpg" && collage.regressionCount === 5) {
        console.log("✅ getCollage() test passed!");
    } else {
        console.error("❌ getCollage() test failed!");
        process.exit(1);
    }
}

// Simple test runner since we don't have a full jest setup for the SDK yet
testCollage().catch(e => {
    console.error(e);
    process.exit(1);
});
