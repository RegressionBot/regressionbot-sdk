import type { ReadableStream } from 'stream/web';
import { VRConfig, Viewport, Viewports, JobStatus, JobSummary, JobProgress, PageResult } from './types';
import {
    sanitizeFilename,
    sanitizeUrlToPath,
    warnIfInsecure,
    validateProtocol,
    handleApiError,
    fetchWithTimeout
} from './security';

export { sanitizeFilename, sanitizeUrlToPath, Viewports };
export type { PageResult, JobProgress, JobStatus, JobSummary, Viewport, VRConfig };

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
        warnIfInsecure(this.apiUrl);
        validateProtocol(this.apiUrl, 'API URL');
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

        const response = await fetchWithTimeout(`${this.apiUrl}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            redirect: 'error'
        });

        if (!response.ok) {
            await handleApiError(response, this.apiKey);
        }

        return await response.json() as T;
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
        validateProtocol(testOrigin, 'testOrigin');
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
        validateProtocol(origin, 'baseOrigin');
        this.manifest.baseOrigin = origin.replace(/\/$/, '');
        return this;
    }

    public sitemap(url: string): this {
        validateProtocol(url, 'sitemapUrl');
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

    public async approve(): Promise<{ message: string; jobId: string; approvedUrlsCount: number; failedCount?: number }> {
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
        const { pipeline } = require('stream/promises');
        const { Readable } = require('stream');
        const baseDir = options.baseDir || path.join(process.cwd(), 'regressions');
        const safeJobId = sanitizeFilename(this.jobId);
        const jobDir = path.join(baseDir, safeJobId);

        if (!fs.existsSync(jobDir)) fs.mkdirSync(jobDir, { recursive: true });

        const download = async (url: string, name: string) => {
            try {
                // 🛡️ SECURITY: Prevent SSRF and local file reads by enforcing HTTP(S) protocol
                validateProtocol(url, 'download URL');

                // 🛡️ SECURITY: Fetch with timeout
                const res = await fetchWithTimeout(url);
                
                if (!res.ok) {
                    console.warn(`Warning: Failed to download ${name} from ${url} (Status: ${res.status})`);
                    return;
                }
                if (!res.body) {
                    console.warn(`Warning: Response body is empty for ${name} from ${url}`);
                    return;
                }
                
                const filePath = path.join(jobDir, name);
                const fileStream = fs.createWriteStream(filePath);
                try {
                    await pipeline(Readable.fromWeb(res.body as ReadableStream), fileStream);
                } catch (streamErr: any) {
                    fileStream.close();
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                    throw streamErr;
                }
            } catch (err: any) {
                console.warn(`Warning: Failed to download ${name}: ${err.message}`);
            }
        };

        // Regressions
        for (const r of summary.regressions) {
            const nameBase = sanitizeUrlToPath(r.url);
            const safeVariant = sanitizeFilename(r.variant);

            if (r.diffUrl) await download(r.diffUrl, `${nameBase}_diff_${safeVariant}.png`);
            if (options.full) {
                if (r.baselineUrl) await download(r.baselineUrl, `${nameBase}_baseline_${safeVariant}.png`);
                if (r.currentUrl) await download(r.currentUrl, `${nameBase}_current_${safeVariant}.png`);
            }
        }

        // Matches (Full only)
        if (options.full && summary.matches) {
            for (const m of summary.matches) {
                const nameBase = sanitizeUrlToPath(m.url);
                const safeVariant = sanitizeFilename(m.variant);

                if (m.baselineUrl) await download(m.baselineUrl, `${nameBase}_baseline_${safeVariant}.png`);
                if (m.currentUrl) await download(m.currentUrl, `${nameBase}_current_${safeVariant}.png`);
            }
        }
    }

    public async waitForCompletion(
        intervalMs: number = 2000, 
        callback?: (status: JobStatus) => void
    ): Promise<JobStatus> {
        while (true) {
            const status = await this.getStatus();
            if (callback) callback(status);
            if (status.status === 'COMPLETED' || status.status === 'APPROVED') return status;
            if (status.status === 'FAILED') throw new Error(`Job Failed: ${status.error}`);
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
    }
}
