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

## 2024-03-19 - Path Traversal Vulnerability in sanitizeUrlToPath
**Vulnerability:** The `sanitizeUrlToPath` function extracted the path portion of a URL and simply replaced forward slashes and hyphens with underscores. It failed to account for directory traversal payloads in other parts of the URI scheme, like Windows-style backslashes `\` or URL encoded strings like `%2e%2e` (which decode to `..`). Since this URL path was later used directly in a concatenation for local `fs.writeFileSync` path arguments, it allowed arbitrary remote file write.
**Learning:** Never assume standard regex replacements for common slashes are enough to sanitize user input for filesystem paths. Always decode URLs and pass everything through a strict allow-list sanitization function like `sanitizeFilename` before trusting it on the host OS.
**Prevention:** Unify sanitization logic. Make sure functions that create strings intended for the filesystem always leverage the project's strict `sanitizeFilename` helper, rather than implementing their own loose regex.
