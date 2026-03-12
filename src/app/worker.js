import logger from '../shared/logger/logger.js';
import { normalizeError } from '../shared/errors/normalizeError.js';
import { env } from '../config/env.js';
import { bootstrap } from './bootstrap.js';

async function main() {
  let context;
  try {
    context = await bootstrap();
  } catch (err) {
    logger.error('Bootstrap failed — worker cannot start', { error: err.message });
    process.exit(1);
  }

  const { allReports, executeReports, cleanup } = context;
  const triggerRegistry = context.triggerRegistry;
  const triggers = triggerRegistry.getAll();

  logger.info('Triggers loaded', {
    count: triggers.length,
    types: triggers.map((t) => t.type),
  });

  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}, shutting down gracefully...`);
    await cleanup();
    process.exit(0);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  logger.info('Worker started (sequential loop)', { intervalMs: env.POLL_INTERVAL_MS });

  async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function pollTick() {
    if (shuttingDown) return;

    // Poll all registered triggers
    for (const trigger of triggers) {
      let events;
      try {
        events = await trigger.poll();
      } catch (err) {
        // Log but do NOT crash worker — trigger polling failures are isolated
        logger.error('Trigger poll failed', {
          triggerType: trigger.type,
          error: err.message,
        });
        continue; // Skip to next trigger
      }

      if (!events || events.length === 0) {
        logger.debug('No events for trigger', { triggerType: trigger.type });
        continue;
      }

      // Process each event from this trigger
      for (const event of events) {
        try {
          if (typeof trigger.markReady === 'function') {
            await trigger.markReady(event.triggerId, {
              closeDate: event.close_date,
              triggerType: event.triggerType,
            });
          }

          const claim = await trigger.claim(event.triggerId);

          if (!claim.proceed) {
            logger.debug('Event already processed or running', {
              triggerType: event.triggerType,
              triggerId: event.triggerId,
            });
            continue;
          }

          // Filter reports matching this trigger type
          const relevantReports = allReports.filter((r) => r.triggerType === event.triggerType);

          if (relevantReports.length === 0) {
            logger.warn('No reports registered for trigger type', {
              triggerType: event.triggerType,
              triggerId: event.triggerId,
            });
            await trigger.markDone(event.triggerId, {
              counts: { total: 0, done: 0, failed: 0, skipped: 0 },
              failedReports: [],
            });
            continue;
          }

          logger.info('Processing trigger event', {
            triggerType: event.triggerType,
            triggerId: event.triggerId,
            close_date: event.close_date,
            mode: claim.mode,
            reportsCount: relevantReports.length,
          });

          // Execute reports for this trigger event
          const summary = await executeReports(
            event, // eventContext
            relevantReports,
            claim.mode,
            claim.failedReports || [],
            trigger // Pass trigger for state management
          );

          logger.info('Trigger event finalized by executeReports', {
            triggerType: event.triggerType,
            triggerId: event.triggerId,
            summary,
          });
        } catch (err) {
          const appError = normalizeError(err, 'poll-tick');
          logger.error('Trigger event processing failed', {
            triggerType: event.triggerType,
            triggerId: event.triggerId,
            errorCode: appError.code,
            message: appError.message,
          });

          try {
            await trigger.markFailed(event.triggerId, appError.code, appError.message, {
              counts: { total: 0, done: 0, failed: 1, skipped: 0 },
              error: { code: appError.code, message: appError.message },
            });
          } catch (markErr) {
            logger.error('Failed to mark trigger as failed', {
              triggerType: event.triggerType,
              triggerId: event.triggerId,
              error: markErr.message,
            });
          }
        }
      }
    }
  }

  // Sequential loop to prevent overlapping ticks
  async function startWorkerLoop() {
    while (!shuttingDown) {
      try {
        await pollTick();
      } catch (unexpectedErr) {
        logger.error('Unexpected error in worker loop', { error: unexpectedErr.message });
      }
      
      if (!shuttingDown) {
        await sleep(env.POLL_INTERVAL_MS);
      }
    }
    logger.info('Worker loop stopped');
  }

  // Start the sequential worker loop
  startWorkerLoop();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
