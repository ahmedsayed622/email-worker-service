import nodemailer from 'nodemailer';
import { existsSync } from 'node:fs';
import logger from '../../shared/logger/logger.js';
import { normalizeError } from '../../shared/errors/normalizeError.js';
import { AppError } from '../../shared/errors/AppError.js';

export function createSmtpAdapter(transportConfig) {
  const transporter = nodemailer.createTransport(transportConfig);

  return {
    async send({ from, to, subject, body, attachments = [] }) {
      try {
        for (const attachment of attachments) {
          if (!existsSync(attachment.path)) {
            throw new AppError({
              code: 'EXPORT_FAILED',
              message: `Attachment file not found: ${attachment.path}`,
              retryable: false,
            });
          }
        }

        const mappedAttachments = attachments.map((a) => ({
          filename: a.filename,
          path: a.path,
        }));

        const info = await transporter.sendMail({
          from: from || transportConfig.from,
          to,
          subject,
          html: body,
          attachments: mappedAttachments,
        });

        logger.info('Email sent', { from: from || transportConfig.from, to, subject, messageId: info.messageId });
      } catch (err) {
        const appError = normalizeError(err, 'email');
        logger.error('Email send failed', { to, subject, error: appError.message });
        throw appError;
      }
    },
  };
}
