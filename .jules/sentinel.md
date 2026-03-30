## 2024-10-18 - [Path Traversal in CLI File Download]
**Vulnerability:** The `regressionbot summary <jobId> --download` command uses `jobId` and `variantName` directly in `path.join` to create directories. This allows path traversal if these values contain `../`.
**Learning:** CLI tools that write to the filesystem based on user input or API responses must sanitize file paths, just like server-side code.
**Prevention:** Use a sanitization function or `path.basename()` to ensure path segments do not contain separators or traversal sequences.

## 2024-11-04 - [SSRF/Path Traversal in API Requests]
**Vulnerability:** The `JobHandle` methods in `src/index.ts` constructed API paths using the `jobId` parameter directly without escaping or encoding it (e.g., `/job/${this.jobId}`). This allowed a path traversal attack and SSRF.
**Learning:** Using untrusted input to construct API paths without proper encoding can lead to SSRF or path traversal vulnerabilities.
**Prevention:** Always use `encodeURIComponent()` to sanitize parameters that are incorporated into a URL path segment.

## 2025-03-01 - [Prototype Pollution in CLI Argument Parsing]
**Vulnerability:** The `parseArgs` function in `src/cli.ts` initialized its `options` object with `{ _: [] }` and allowed dynamic assignment of keys directly from user-supplied command line arguments (e.g. `--__proto__ polluted`). This allowed prototype pollution which could manipulate application behavior downstream.
**Learning:** Argument parsers must sanitize user-supplied keys and ensure they do not write to or inherit from `Object.prototype` to prevent prototype pollution or shadowing native properties.
**Prevention:** Always use `Object.create(null)` for option objects and explicitly deny keys like `__proto__`, `constructor`, and `prototype` during argument parsing.

## 2025-03-01 - [Path Traversal bypass via URL Encoding and Backslashes]
**Vulnerability:** The `sanitizeUrlToPath` function used URL `pathname` extraction and replaced forward slashes and hyphens, but failed to handle URL-encoded sequences (`%2e%2e%2f` etc.) or Windows-style backslashes (`\`). This allowed path traversal to bypass sanitization when constructing filenames for local downloads in `JobHandle.downloadResults`.
**Learning:** Naive replacement of forward slashes is insufficient to prevent path traversal on URLs, as `URL.pathname` leaves URL-encoded characters and backslashes intact, which are then evaluated by `path.join` or the OS file system.
**Prevention:** Always decode URL components first, and then apply a robust filename sanitization routine (e.g. replacing any character not in an explicit whitelist, like `[a-zA-Z0-9_]`) before using the output in file system operations.

## 2025-03-01 - [Denial of Service via Hanging API or Download Requests]
**Vulnerability:** The internal `_request` fetch wrapper and `downloadResults` fetch logic in `src/index.ts` did not specify timeouts, meaning requests to the API or external URLs could hang indefinitely if the server failed to respond or drip-fed data.
**Learning:** All network calls (like `fetch`) should be bounded by timeouts. Without them, a single hanging request can lock up application state, block the event loop in concurrent operations, and cause a denial of service.
**Prevention:** Implement an `AbortController` coupled with `setTimeout` to enforce a hard maximum duration on all `fetch` requests, and ensure errors (including timeout exceptions) are caught and explicitly re-thrown.
