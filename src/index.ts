import { VRConfig, Viewport, Viewports, JobStatus, JobSummary, JobResult } from './types';

export class Visual {
    private apiKey: string;
    private apiUrl: string;

    constructor(apiKey?: string, apiUrl?: string) {
        this.apiKey = apiKey || process.env.REGRESSIONBOT_API_KEY || "";
        this.apiUrl = apiUrl || process.env.REGRESSIONBOT_API_URL || "https://api.regressionbot.com";
        
        if (!this.apiKey) {
            console.warn("Warning: No API Key provided. Set REGRESSIONBOT_API_KEY environment variable or pass it to the constructor.");
        }
        
        if (this.apiUrl.endsWith('/')) {
            this.apiUrl = this.apiUrl.slice(0, -1);
        }

        // 🛡️ SECURITY: Warn about unencrypted data transmission
        const lowerApiUrl = this.apiUrl.toLowerCase();
        if (lowerApiUrl.startsWith('http://')) {
            try {
                const parsedUrl = new URL(this.apiUrl);
                if (parsedUrl.hostname !== 'localhost' && parsedUrl.hostname !== '127.0.0.1') {
                    console.warn('Security Warning: API URL is using HTTP. It is highly recommended to use HTTPS to prevent exposing the API Key.');
                }
            } catch (e: any) {
                // Ignore parsing errors for warning
            }
        } else if (!lowerApiUrl.startsWith('https://')) {
            console.warn(`Security Warning: API URL is using an unrecognized protocol (${this.apiUrl}). It is highly recommended to use HTTPS.`);
        }
    }

    /**
     * Set the candidate URL/Origin to test.
     */
    public test(origin: string): JobBuilder {
        return new JobBuilder(this, origin);
    }

    /**
     * Get a handle to an existing job.
     */
    public job(jobId: string): JobHandle {
        return new JobHandle(this, jobId);
    }

    // Internal fetch wrapper
    public async _request<T>(path: string, method: string = 'GET', body?: any): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey
        };

        // 🛡️ SECURITY: Add timeout to prevent hanging requests/DoS
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(`${this.apiUrl}${path}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
                // 🛡️ SECURITY: Prevent cross-origin API key leakage via redirects
                redirect: 'error'
            });

            if (!response.ok) {
                let errorText = await response.text();

                // 🛡️ SECURITY: Redact API key to prevent exposure in CI logs
                if (this.apiKey && errorText.includes(this.apiKey)) {
                    errorText = errorText.split(this.apiKey).join('***REDACTED***');
                }

                // 🛡️ SECURITY: Limit error text length to prevent log flooding (DoS)
                if (errorText.length > 500) {
                    errorText = errorText.substring(0, 500) + '...';
                }

                throw new Error(`API Error ${response.status}: ${errorText}`);
            }

            return await response.json() as T;
        } finally {
            clearTimeout(timeoutId);
        }
    }
}

export class JobBuilder {
    private sdk: Visual;
    private manifest: {
        testOrigin: string;
        sitemapUrl?: string;
        baseOrigin?: string;
        projectId?: string;
        variants: string[];
        checks: Array<{ path: string, label?: string }>;
        scans: Array<{ pattern: string, options?: any }>;
        concurrency: number;
    };

    constructor(sdk: Visual, testOrigin: string) {
        this.sdk = sdk;
        this.manifest = {
            testOrigin: testOrigin.replace(/\/$/, ''),
            variants: [],
            checks: [],
            scans: [],
            concurrency: 10
        };
    }

    public against(origin: string): this {
        this.manifest.baseOrigin = origin.replace(/\/$/, '');
        return this;
    }

    public sitemap(url: string): this {
        this.manifest.sitemapUrl = url;
        return this;
    }

    public forProject(id: string): this {
        this.manifest.projectId = id;
        return this;
    }

    /**
     * Define the matrix: list of Playwright devices or viewport names.
     */
    public on(variants: string[]): this {
        this.manifest.variants.push(...variants);
        return this;
    }

    /**
     * Add a specific page to the test scope.
     */
    public check(path: string, label?: string): this {
        this.manifest.checks.push({ path, label });
        return this;
    }

    /**
     * Add a discovery rule to scan the sitemap.
     */
    public scan(pattern: string, options?: { limit?: number, exclude?: string[] }): this {
        this.manifest.scans.push({ pattern, options });
        return this;
    }

    public concurrency(n: number): this {
        this.manifest.concurrency = n;
        return this;
    }

    public autoApprove(val: boolean = true): this {
        (this.manifest as any).autoApprove = val;
        return this;
    }

    public mask(selectors: string[]): this {
        (this.manifest as any).masks = selectors;
        return this;
    }

    /**
     * Compiles the manifest and triggers the API.
     */
    public async run(): Promise<JobHandle> {
        if (!this.manifest.projectId && !this.manifest.baseOrigin) {
            throw new Error('Project ID is required. Use .forProject("id") or provide an origin to compare against using .against()');
        }

        // If no checks/scans provided, default to root
        if (this.manifest.checks.length === 0 && this.manifest.scans.length === 0) {
            this.manifest.checks.push({ path: '/', label: 'Home' });
        }

        const payload = {
            project: this.manifest.projectId,
            testOrigin: this.manifest.testOrigin,
            sitemapUrl: this.manifest.sitemapUrl,
            baseOrigin: this.manifest.baseOrigin,
            devices: this.manifest.variants,
            paths: this.manifest.checks,
            scans: this.manifest.scans,
            concurrency: this.manifest.concurrency,
            autoApprove: (this.manifest as any).autoApprove,
            masks: (this.manifest as any).masks
        };

        const res = await this.sdk._request<{ jobId: string }>('/crawl', 'POST', payload);
        return new JobHandle(this.sdk, res.jobId);
    }
}

export function sanitizeFilename(name: string): string {
    if (!name) return 'unknown';
    // Allow alphanumeric and underscore. Replace everything else (including hyphens and spaces) with underscore.
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Converts a URL into a clean, flat string representing its path.
 * e.g. https://example.com/ai/jules-agent -> ai_jules_agent
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

export class JobHandle {
    private sdk: Visual;
    public jobId: string;

    constructor(sdk: Visual, jobId: string) {
        this.sdk = sdk;
        this.jobId = jobId;
    }

    public async getStatus(): Promise<JobStatus> {
        return this.sdk._request<JobStatus>(`/job/${encodeURIComponent(this.jobId)}`);
    }

    public async getSummary(): Promise<JobSummary> {
        return this.sdk._request<JobSummary>(`/job/${encodeURIComponent(this.jobId)}/summary`);
    }

    public async approve(): Promise<{ message: string }> {
        return this.sdk._request('/approve', 'POST', { jobId: this.jobId });
    }

    /**
     * Download images for the job locally.
     * @param options Download options.
     */
    public async downloadResults(options: { 
        full?: boolean, 
        baseDir?: string 
    } = {}): Promise<void> {
        const summary = await this.getSummary();
        const fs = require('fs');
        const path = require('path');
        const baseDir = options.baseDir || path.join(process.cwd(), 'regressions');
        const safeJobId = sanitizeFilename(this.jobId);
        const jobDir = path.join(baseDir, safeJobId);

        if (!fs.existsSync(jobDir)) fs.mkdirSync(jobDir, { recursive: true });

        const download = async (url: string, name: string) => {
            // 🛡️ SECURITY: Prevent SSRF and local file reads by enforcing HTTP(S) protocol
            let parsed: URL;
            try {
                parsed = new URL(url);
            } catch (e) {
                throw new Error(`Invalid URL for download: ${url}`);
            }
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                throw new Error(`Unsupported protocol for download: ${parsed.protocol}`);
            }

            // 🛡️ SECURITY: Add timeout to prevent hanging requests/DoS
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            try {
                const res = await fetch(url, { signal: controller.signal });
                const buffer = Buffer.from(await res.arrayBuffer());
                const filePath = path.join(jobDir, name);
                fs.writeFileSync(filePath, buffer);
            } finally {
                clearTimeout(timeoutId);
            }
        };

        // Collage
        if (summary.collageUrl) {
            await download(summary.collageUrl, 'collage.jpg');
        }

        // Regressions
        for (const r of summary.regressions) {
            const nameBase = sanitizeUrlToPath(r.url);
            const safeVariant = sanitizeFilename(r.variantName);
            
            await download(r.diffUrl, `${nameBase}_diff_${safeVariant}.png`);
            if (options.full) {
                await download(r.baselineUrl, `${nameBase}_baseline_${safeVariant}.png`);
                await download(r.currentUrl, `${nameBase}_current_${safeVariant}.png`);
            }
        }

        // Matches (Full only)
        if (options.full && summary.matches) {
            for (const m of summary.matches) {
                const nameBase = sanitizeUrlToPath(m.url);
                const safeVariant = sanitizeFilename(m.variantName);
                
                await download(m.baselineUrl, `${nameBase}_baseline_${safeVariant}.png`);
                await download(m.currentUrl, `${nameBase}_current_${safeVariant}.png`);
            }
        }
    }

    public async waitForCompletion(
        intervalMs: number = 2000, 
        callback?: (status: JobStatus) => void
    ): Promise<JobStatus> {
        await new Promise(resolve => setTimeout(resolve, 3000));
        while (true) {
            const status = await this.getStatus();
            if (callback) callback(status);
            if (status.status === 'COMPLETED' || status.status === 'APPROVED') return status;
            if (status.status === 'FAILED') throw new Error(`Job Failed: ${status.error}`);
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
    }
}
