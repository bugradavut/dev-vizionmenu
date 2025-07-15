import { Job } from "bullmq";
import { JobResult } from "../types/jobs";
export declare class SyncProcessor {
    processJob(job: Job): Promise<JobResult>;
    private syncUberEatsOrders;
    private syncDoorDashOrders;
    private syncMenuToThirdParty;
    private fetchUberEatsOrders;
    private processUberEatsOrder;
    private syncMenuToUberEats;
    private fetchDoorDashOrders;
    private processDoorDashOrder;
    private syncMenuToDoorDash;
    private fetchMenuData;
    private saveOrder;
    private mapUberEatsStatus;
    private mapDoorDashStatus;
    private transformMenuToUberEatsFormat;
    private transformMenuToDoorDashFormat;
}
//# sourceMappingURL=sync.processor.d.ts.map