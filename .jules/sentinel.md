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

## 2026-03-14 - [SSRF/Credential Leak in API Redirects]
**Vulnerability:** The `Visual._request` method used `fetch` to send the `x-api-key` header to the configured API URL without restricting redirects. If the API URL redirected to a malicious server, `fetch` would automatically follow it and leak the sensitive API key.
**Learning:** Automatically following redirects with sensitive HTTP headers like `Authorization` or custom API keys can lead to credential leakage.
**Prevention:** Always set `redirect: 'error'` or `redirect: 'manual'` in `fetch` options when sending requests with sensitive headers to prevent them from being leaked to unintended destinations.

## 2026-03-14 - [Path Traversal in URL Sanitization on Windows]
**Vulnerability:** The `sanitizeUrlToPath` function used `.replace(/[\/\-]/g, '_')` to sanitize paths, but it did not replace backslashes (`\`). On Windows systems, backslashes act as path separators, allowing path traversal if a URL contains backslashes (e.g. `data:text/html,\..\..\..\etc\passwd`).
**Learning:** When sanitizing URLs or paths to be used as filenames, you must consider all possible path separators for different operating systems, including backslashes.
**Prevention:** Ensure sanitization functions strip or replace backslashes (`\`) along with forward slashes (`/`), e.g., using `.replace(/[\/\-\\]/g, '_')`.
