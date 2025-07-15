import { Job } from "bullmq";
import { JobResult } from "../types/jobs";
export declare class WebhookProcessor {
    processJob(job: Job): Promise<JobResult>;
    private processStripeWebhook;
    private processThirdPartyWebhook;
    private handlePaymentSucceeded;
    private handlePaymentFailed;
    private handleSubscriptionPayment;
    private handleSubscriptionCreated;
    private handleSubscriptionUpdated;
    private handleSubscriptionCanceled;
    private processUberEatsWebhook;
    private processDoorDashWebhook;
    private processGrubHubWebhook;
    private handleThirdPartyOrderPlaced;
    private handleThirdPartyOrderUpdated;
    private handleThirdPartyOrderCanceled;
    private verifyStripeSignature;
    private verifyUberEatsSignature;
}
//# sourceMappingURL=webhook.processor.d.ts.map