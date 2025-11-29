// src/utils/batchUpdates.ts

/**
 * Batch multiple DOM operations into a single frame
 * to prevent layout thrashing and improve scroll performance
 */
export class BatchUpdater {
    private hideBatch: Set<any> = new Set();
    private showBatch: Map<any, { searchTerm?: string; result?: any }> = new Map();
    private pendingFrame: number | null = null;
    private callback: ((hideBatch: Set<any>, showBatch: Map<any, any>) => void) | null = null;

    constructor(callback: (hideBatch: Set<any>, showBatch: Map<any, any>) => void) {
        this.callback = callback;
    }

    /**
     * Queue a file item to be hidden
     */
    queueHide(fileItem: any): void {
        this.hideBatch.add(fileItem);
        this.showBatch.delete(fileItem); // Remove from show queue if present
        this.scheduleUpdate();
    }

    /**
     * Queue a file item to be shown
     */
    queueShow(fileItem: any, searchTerm?: string, result?: any): void {
        this.showBatch.set(fileItem, { searchTerm, result });
        this.hideBatch.delete(fileItem); // Remove from hide queue if present
        this.scheduleUpdate();
    }

    /**
     * Schedule the batched update for next animation frame
     */
    private scheduleUpdate(): void {
        if (this.pendingFrame !== null) {
            return; // Already scheduled
        }

        this.pendingFrame = requestAnimationFrame(() => {
            this.executeBatch();
        });
    }

    /**
     * Execute all batched operations in a single frame
     */
    private executeBatch(): void {
        if (this.callback) {
            this.callback(this.hideBatch, this.showBatch);
        }

        // Clear batches
        this.hideBatch.clear();
        this.showBatch.clear();
        this.pendingFrame = null;
    }

    /**
     * Cancel pending updates (for cleanup)
     */
    cancel(): void {
        if (this.pendingFrame !== null) {
            cancelAnimationFrame(this.pendingFrame);
            this.pendingFrame = null;
        }
        this.hideBatch.clear();
        this.showBatch.clear();
    }
}
