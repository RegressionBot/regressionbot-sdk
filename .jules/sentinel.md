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

## 2025-05-18 - [Path Traversal in URL Pathname Sanitization]
**Vulnerability:** The `sanitizeUrlToPath` function used the URL's pathname and replaced only forward slashes (`/`) and hyphens (`-`). When URLs with non-hierarchical schemes like `mailto:` or `data:` were processed, `..` or `\` sequences in the path were preserved. These unsanitized strings were later used to build file paths during downloads, leading to potential path traversal vulnerabilities (e.g., `data:text/html,../../../../etc/passwd`).
**Learning:** URL sanitizers must assume any unescaped or unhandled special character could be a path traversal primitive (`.` or `\`), especially when dealing with varied URL schemes. Only allowlisting safe characters prevents these issues.
**Prevention:** Always use strict allowlisting (e.g., replacing `/[^a-zA-Z0-9_]/g` with underscores) when generating file names or local filesystem paths from untrusted URL strings.
