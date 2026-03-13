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

## 2024-05-08 - Path Traversal via Job Download URLs
**Vulnerability:** The `sanitizeUrlToPath` function used to construct local file paths in `JobHandle.downloadResults` allowed characters like `.` and `\` from URL pathnames, as well as URL-encoded variations (`%2e`, `%5c`), enabling path traversal attacks if a malicious result URL was downloaded (e.g. `data:text/plain,..\..\..\etc\passwd`).
**Learning:** Functions that parse URLs into file paths must actively decode and strip or sanitize *all* filesystem meta-characters. Only removing `/` and `-` is insufficient. The combination of encoded characters and URL protocols (like `data:`) can bypass weak regex filters.
**Prevention:** Always decode components (`decodeURIComponent`) and pipe the result through a robust filename sanitizer (`sanitizeFilename`) before joining file paths. Never construct filesystem paths directly from parts of untrusted URLs without an explicit whitelist character set.
