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

        // Prevent API key leakage on redirect
        const response = await fetch(`${this.apiUrl}${path}`, {
            method,
            headers,
            redirect: 'error',
            body: body ? JSON.stringify(body) : undefined
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        return response.json() as Promise<T>;
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
        if (!this.manifest.projectId) {
            throw new Error('Project ID is required. Use .forProject("id")');
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
    // Allow alphanumeric, underscore, hyphen, space.
    return name.replace(/[^a-zA-Z0-9_\- ]/g, '_');
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

        const download = async (url: string, destDir: string, name: string) => {
            // Prevent SSRF: only allow http/https protocols
            const protocol = new URL(url).protocol;
            if (protocol !== 'http:' && protocol !== 'https:') {
                throw new Error(`Invalid URL protocol: ${protocol}. Only http and https are allowed.`);
            }
            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
            const res = await fetch(url);
            const buffer = Buffer.from(await res.arrayBuffer());
            const filePath = path.join(destDir, name);
            fs.writeFileSync(filePath, buffer);
        };

        // Collage
        if (summary.collageUrl) {
            const collageDir = path.join(baseDir, safeJobId);
            await download(summary.collageUrl, collageDir, 'collage.jpg');
        }

        // Regressions
        for (const r of summary.regressions) {
            const safeUrl = sanitizeFilename(r.url);
            const safeVariant = sanitizeFilename(r.variantName);
            const destDir = path.join(baseDir, safeJobId, safeUrl, safeVariant);
            
            await download(r.diffUrl, destDir, 'diff.png');
            if (options.full) {
                await download(r.baselineUrl, destDir, 'baseline.png');
                await download(r.currentUrl, destDir, 'current.png');
            }
        }

        // Matches (Full only)
        if (options.full && summary.matches) {
            for (const m of summary.matches) {
                const safeUrl = sanitizeFilename(m.url);
                const safeVariant = sanitizeFilename(m.variantName);
                const destDir = path.join(baseDir, safeJobId, safeUrl, safeVariant);
                
                await download(m.baselineUrl, destDir, 'baseline.png');
                await download(m.currentUrl, destDir, 'current.png');
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
