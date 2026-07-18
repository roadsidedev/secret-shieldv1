export interface WorkerJob {
    type: 'scan' | 'prune';
    data: any;
}
export declare class IsolatedSandbox {
    private memoryLimitMB;
    private timeoutMs;
    private isolate;
    private context;
    constructor(memoryLimitMB?: number, timeoutMs?: number);
    run<T>(code: string, data: any): Promise<T>;
    dispose(): void;
}
export declare class WorkerPool {
    private size;
    private _recycleAfter;
    private jobTimeoutMs;
    private useIsolatedVM;
    private queue;
    private activeCount;
    private useInlineFallback;
    private recycleCount;
    constructor(size?: number, _recycleAfter?: number, jobTimeoutMs?: number, useIsolatedVM?: boolean);
    private workerScriptExists;
    run(job: WorkerJob): Promise<any>;
    private runIsolated;
    private runInline;
    private spawnAndRun;
    private processQueue;
    getActiveCount(): number;
    getQueueSize(): number;
}
//# sourceMappingURL=worker.d.ts.map