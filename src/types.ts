export interface VRConfig {
    apiKey?: string;
    apiUrl?: string;
}

export interface Viewport {
    width: number;
    height: number;
}

export const Viewports = {
    DESKTOP: { width: 1920, height: 1080 },
    LAPTOP: { width: 1366, height: 768 },
    TABLET: { width: 768, height: 1024 },
    MOBILE: { width: 375, height: 667 }
} as const;

export interface JobResult {
    url: string;
    status: 'SUCCESS' | 'ERROR';
    diffCount?: number;
    diffPercentage?: number;
    score?: number;
    currentKey?: string;
    baselineKey?: string;
    diffKey?: string;
    isNewBaseline?: boolean;
    errorMessage?: string;
    aiSummary?: string;
    variantName: string;
}

export interface JobStatus {
    jobId: string;
    status: 'PROCESSING' | 'COMPLETED' | 'APPROVED' | 'FAILED' | 'INITIALIZING' | 'FINISHING';
    error?: string;
    progress?: {
        total: number;
        completed: number;
        percent: string;
    };
    executionTime?: number;
    results?: JobResult[];
    createdAt?: string;
}

export interface JobSummary {
    jobId: string;
    status: string;
    totalUrls: number;
    completedCount: number;
    overallScore: number;
    executionTime: number;
    regressionCount: number;
    matchCount: number;
    newBaselineCount: number;
    errorCount: number;
    collageUrl?: string;
    regressions: Array<{
        url: string;
        variantName: string;
        diffCount: number;
        score: number;
        baselineUrl: string;
        currentUrl: string;
        diffUrl: string;
        aiSummary?: string;
    }>;
    matches: Array<{
        url: string;
        variantName: string;
        score: number;
        baselineUrl: string;
        currentUrl: string;
        aiSummary?: string;
    }>;
    newBaselines: Array<{
        url: string;
        variantName: string;
    }>;
    errors: Array<{
        url: string;
        errorMessage: string;
        variantName: string;
        score: number;
    }>;
}

export type RegressionBotSummary = JobSummary;
