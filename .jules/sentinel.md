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

## 2025-03-15 - [Path Traversal in URL Sanitization]
**Vulnerability:** The `sanitizeUrlToPath` function in `src/index.ts` parsed URLs and replaced only slashes and hyphens from the `pathname`, but allowed other characters (like backslashes and dots) to remain. This allowed path traversal (e.g., `data:image/png,..\\..\\..\\Windows\\System32\\cmd.exe` resulting in a pathname of `image/png,..\\..\\..\\Windows\\System32\\cmd.exe`) when the sanitized result was used for writing files in the CLI summary download function.
**Learning:** Simply replacing slashes is not sufficient for path sanitization, as other schemas (like `data:`) or backslashes (`\`) can still contain path traversal sequences that node's `path` module processes.
**Prevention:** Always run user-influenced strings (including URL properties like `pathname`) through a robust sanitization function (like `sanitizeFilename` that allows only specific safe characters) before incorporating them into file system operations.
