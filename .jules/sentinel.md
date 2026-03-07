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

## 2025-05-18 - [Unencrypted Sensitive Data Transmission and SSRF]
**Vulnerability:** The `Visual` SDK accepted `http://` URLs for `apiUrl` which could expose the `x-api-key` in plaintext over the network. Additionally, `JobHandle.downloadResults` allowed arbitrary URL schemes like `file://` to be fetched by `fetch()` during image download, introducing SSRF and local file read risks.
**Learning:** SDK configurations should strictly warn or enforce secure protocols (HTTPS) to prevent accidental secret exposure. API responses containing URLs to be downloaded should be validated for safe protocols before passing them to internal HTTP clients.
**Prevention:** Add protocol validation checking for `http://` or `https://` on user-provided or API-provided URLs. Allow `http://` only for local development (`localhost` / `127.0.0.1`), logging a warning otherwise, and strictly enforce `http` or `https` schemes before performing downloads.
