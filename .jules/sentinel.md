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

## 2025-03-08 - [Path Traversal / Unsafe Filenames in URL Sanitization]
**Vulnerability:** The `sanitizeUrlToPath` function in `src/index.ts` only replaced `/` and `-` characters with `_`. This allowed potentially dangerous characters like `.` and `\` to remain in the returned string (e.g. from a URL path like `/..\\..\\etc\\passwd`). When this string was subsequently used to construct file paths (e.g. in `downloadResults`), it could lead to path traversal or write to arbitrary locations on the filesystem, especially on Windows.
**Learning:** URL path names are not implicitly safe to use as filesystem path segments. Replacing only a subset of characters (like slashes) is insufficient because attackers can use alternative path separators (`\`) or dot-dot-slash (`../`) sequences that bypass naive filters.
**Prevention:** Always use a strict allowlist approach for sanitizing strings intended for use in the filesystem. Replacing all non-alphanumeric characters with a safe character (like `_`) ensures no traversal sequences or invalid characters can be injected.
