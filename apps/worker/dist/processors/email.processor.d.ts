import { Job } from "bullmq";
import { JobResult } from "../types/jobs";
export declare class EmailProcessor {
    processJob(job: Job): Promise<JobResult>;
    private sendEmail;
    private sendOrderConfirmation;
    private sendOrderStatusUpdate;
    private sendWelcomeEmail;
    private sendPasswordReset;
    private generateOrderConfirmationHtml;
    private generateOrderStatusUpdateHtml;
    private generateWelcomeEmailHtml;
    private generatePasswordResetHtml;
}
//# sourceMappingURL=email.processor.d.ts.map