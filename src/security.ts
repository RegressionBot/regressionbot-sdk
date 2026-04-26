/**
 * 🛡️ Security Utilities
 * Centralized logic for sanitization, protocol validation, and secure network requests.
 */

/**
 * Sanitizes a string for use as a filename or directory segment.
 * Replaces any character not in [a-zA-Z0-9_] with an underscore.
 */
export function sanitizeFilename(name: string): string {
    if (!name) return 'unknown';
    // Allow alphanumeric and underscore. Replace everything else with underscore.
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Converts a URL into a clean, flat string representing its path.
 * e.g. https://example.com/ai/jules-agent -> ai_google_jules_coding_agent_review
 */
export function sanitizeUrlToPath(urlStr: string): string {
    try {
        const url = new URL(urlStr);
        let path = url.pathname;
        try {
            path = decodeURIComponent(path);
        } catch (e) {
            // Ignore malformed URIs
        }
        if (path === '/') return 'root';
        
        // 🛡️ SECURITY: Sanitize to prevent path traversal via URL pathname (e.g. data:../..)
        // Remove leading/trailing slashes and replace all non-alphanumeric chars with underscores
        return path.replace(/^\/|\/$/g, '').replace(/[^a-zA-Z0-9_]/g, '_');
    } catch (e) {
        return sanitizeFilename(urlStr);
    }
}

/**
 * 🛡️ SECURITY: Warn about unencrypted data transmission (HTTP vs HTTPS).
 */
export function warnIfInsecure(url: string, context: string = 'API URL'): void {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.startsWith('http://')) {
        try {
            const parsedUrl = new URL(url);
            if (parsedUrl.hostname !== 'localhost' && parsedUrl.hostname !== '127.0.0.1') {
                console.warn(`Security Warning: ${context} is using HTTP (${url}). It is highly recommended to use HTTPS to prevent exposing sensitive data.`);
            }
        } catch (e) {
            // Ignore parsing errors for warning
        }
    } else if (!lowerUrl.startsWith('https://')) {
        console.warn(`Security Warning: ${context} is using an unrecognized protocol (${url}). It is highly recommended to use HTTPS.`);
    }
}

/**
 * 🛡️ SECURITY: Prevent SSRF and local file reads by enforcing HTTP(S) protocol.
 */
export function validateProtocol(url: string, context: string = 'URL'): void {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch (e) {
        throw new Error(`Invalid ${context}: ${url}`);
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(`Security Error: ${context} must use HTTP or HTTPS. Provided: ${parsed.protocol}`);
    }
}

/**
 * 🛡️ SECURITY: Redact sensitive info and limit length of error messages.
 */
export async function handleApiError(response: Response, apiKey?: string): Promise<never> {
    let errorText = await response.text();

    // 🛡️ SECURITY: Redact API key to prevent exposure in CI logs
    if (apiKey && errorText.includes(apiKey)) {
        errorText = errorText.split(apiKey).join('***REDACTED***');
    }

    // 🛡️ SECURITY: Limit error text length to prevent log flooding (DoS)
    if (errorText.length > 500) {
        errorText = errorText.substring(0, 500) + '...';
    }

    throw new Error(`API Error ${response.status}: ${errorText}`);
}

/**
 * 🛡️ SECURITY: Fetch with a mandatory timeout and forced redirect: 'error' for safety.
 */
export async function fetchWithTimeout(
    url: string, 
    options: RequestInit = {}, 
    timeoutMs: number = 10000
): Promise<Response> {
    return await fetch(url, {
        ...options,
        // 🛡️ SECURITY: AbortSignal.timeout protects against hanging body parsing too
        signal: AbortSignal.timeout(timeoutMs),
        // 🛡️ SECURITY: Prevent cross-origin credential leakage via redirects
        redirect: options.redirect || 'error'
    });
}
