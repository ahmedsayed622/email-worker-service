import logger from '../../shared/logger/logger.js';

export function createDryRunAdapter() {
  return {
    async send({ from, to, subject, body, attachments = [] }) {
      logger.info('DRY-RUN email (not sent)', {
        from,
        to,
        subject,
        attachments: attachments.map((a) => a.filename),
        bodyLength: body?.length,
      });
    },
  };
}
