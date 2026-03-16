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

## 2025-03-16 - [Path Traversal in URL Path Sanitization]
**Vulnerability:** The `sanitizeUrlToPath` function in `src/index.ts` only replaced forward slashes and hyphens with underscores. This allowed malicious URLs containing backslashes or traversal characters (e.g. `http://example.com/..\\..\\etc\\passwd`) to bypass the sanitization logic and write files outside the intended directory when downloading results.
**Learning:** When sanitizing URL paths for filesystem use, do not rely on allow-listing or black-listing specific characters like `/`. Instead, rely on robust sanitization that strips all non-alphanumeric characters, as different protocols or OS representations (e.g. `\` on Windows) can lead to bypasses.
**Prevention:** Always use a comprehensive filename sanitization function (e.g. `sanitizeFilename` replacing `[^a-zA-Z0-9_]`) for any dynamic input that will be used to construct a local file path.
