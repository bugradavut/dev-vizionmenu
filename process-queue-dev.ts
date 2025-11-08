/**
 * DEV Queue Processor - Manual trigger for pending transactions
 *
 * This script directly calls the queue worker to process pending WEB-SRM transactions.
 * Use this in development to test transaction processing with the new DEV certificate.
 */

import { consumeQueue } from './apps/api/services/websrm-adapter/queue-worker';

async function main() {
  console.log('🚀 Processing WEB-SRM transaction queue...\n');

  try {
    const result = await consumeQueue(10); // Process up to 10 items

    console.log('\n✅ Queue processing complete!\n');
    console.log('Results:');
    console.log(`  - Processed: ${result.processed}`);
    console.log(`  - Completed: ${result.completed}`);
    console.log(`  - Failed: ${result.failed}`);
    console.log(`  - Pending: ${result.pending}`);

    if (result.items.length > 0) {
      console.log('\nDetails:');
      result.items.forEach(item => {
        const statusIcon = item.status === 'completed' ? '✓' : item.status === 'failed' ? '✗' : '⟳';
        console.log(`  ${statusIcon} ${item.orderId.substring(0, 8)}: ${item.message}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error processing queue:', error);
    process.exit(1);
  }
}

main();
