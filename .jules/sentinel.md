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

## 2024-05-23 - [Prevent API Key Leakage via Redirects & Error Logs]
**Vulnerability:** The SDK's `_request` method used `fetch` with default settings (which follows redirects and forwards custom headers like `x-api-key`) and logged raw HTTP error responses. This could leak the API key if the API server was compromised to issue redirects, or if a WAF/proxy reflected the request headers in a 400/500 error page.
**Learning:** Node's `fetch` API forwards custom headers cross-origin on redirects by default. Error responses from external APIs should never be trusted or logged verbatim without sanitization, as they run in CI environments where logs are accessible to many users.
**Prevention:** Set `redirect: 'error'` on authenticated API `fetch` calls. Proactively redact sensitive credentials from error response text before throwing/logging, and limit error text length to prevent log flooding.
