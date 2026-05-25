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

## 2026-04-19 - [Denial of Service via Hanging API and Download Requests]
**Vulnerability:** The SDK's `fetch` calls lacked timeouts, making the application vulnerable to Denial of Service (DoS) if the API or download server hung indefinitely. This could block the main execution thread or exhaust resources in CI environments.
**Learning:** All network requests to external services must have reasonable timeouts to ensure application resilience and prevent resource exhaustion.
**Prevention:** Use `AbortController` to implement timeouts for all `fetch` calls, typically around 10-30 seconds depending on the expected response time.

## 2026-04-19 - [API Key Leakage via Redirects and Error Logs]
**Vulnerability:** The `Visual._request` method followed redirects by default, potentially forwarding the `x-api-key` header to third-party domains. Additionally, raw error responses from the API were thrown/logged, which could contain the reflected API key or other sensitive data.
**Learning:** Sensitive headers should not be automatically forwarded on redirects. Error messages from external sources must be sanitized and length-limited before being exposed to logs or users.
**Prevention:** Set `redirect: 'error'` on authenticated `fetch` calls. Proactively redact sensitive credentials from error response text and limit the length of error messages.

## 2026-04-19 - [SSRF and Local File Inclusion in Image Download]
**Vulnerability:** `JobHandle.downloadResults` fetched image URLs directly from API responses without validating the protocol. This allowed a malicious API server to return URLs with `file:` or `data:` schemes, leading to SSRF or arbitrary local file reads during the download process.
**Learning:** When fetching resources from URLs provided by external sources, always validate that the protocol is restricted to safe schemes (e.g., `http:` and `https:`).
**Prevention:** Use `new URL(url).protocol` to verify that download URLs use only authorized protocols before passing them to networking APIs.

## 2026-04-19 - [Unencrypted Sensitive Data Transmission]
**Vulnerability:** The SDK allowed the use of `http://` for the `apiUrl`, which could expose the `x-api-key` in plaintext over the network.
**Learning:** SDKs should encourage or enforce secure communication protocols (HTTPS) to protect sensitive credentials.
**Prevention:** Implement checks to warn users when an insecure protocol is used for API communication, except for local development (localhost).

## 2026-04-20 - [DoS via Ignored Abort Signals in fetchWithTimeout]
**Vulnerability:** The \`fetchWithTimeout\` utility overrode caller-provided \`AbortSignal\`s by exclusively using its own timeout signal. This prevented callers from manually aborting requests, leading to potential resource exhaustion if users cancelled actions but the underlying network requests continued.
**Learning:** When writing fetch wrappers that apply timeouts, you must merge the timeout signal with any signal provided by the caller to ensure both manual aborts and automatic timeouts are respected.
**Prevention:** Use \`AbortSignal.any([options.signal, AbortSignal.timeout(timeoutMs)])\` when configuring fetch signals.
## 2026-05-12 - SSRF via Unvalidated URL Protocols
**Vulnerability:** The SDK accepts URLs for the API, test origin, base origin, and sitemap without validating their protocol, allowing potential SSRF or local file read via file:// or ftp://.
**Learning:** Always validate protocols on all external URL inputs before dispatching them or sending them to a backend, even if the backend is expected to handle them.
**Prevention:** Use a centralized validateProtocol utility on all user-supplied URLs to strictly enforce HTTP/HTTPS.

## 2026-06-25 - [DoS via Memory Exhaustion in File Downloads]
**Vulnerability:** The `JobHandle.downloadResults` method buffered entire file downloads into memory using `Buffer.from(await res.arrayBuffer())`. This made the SDK vulnerable to memory exhaustion (Denial of Service) if an attacker or misconfigured API returned a very large file.
**Learning:** Loading entire files into memory limits scalability and exposes applications to DoS attacks. Network responses representing files or large payloads should always be streamed.
**Prevention:** Use streaming APIs (like `pipeline` and `fs.createWriteStream`) to handle external file downloads, transferring data directly to the disk without keeping the entire payload in memory.
