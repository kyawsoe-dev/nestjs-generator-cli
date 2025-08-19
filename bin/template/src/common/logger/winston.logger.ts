import { createLogger, format, transports } from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';
import * as fs from 'fs';

const logDir = path.join(process.cwd(), 'logs');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const rotateTransport = new DailyRotateFile({
  dirname: logDir,
  filename: '%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d', // keep logs for 14 days
});

rotateTransport.on('new', () => {
  fs.readdir(logDir, (err, files) => {
    if (err) {
      console.error('Failed to read logs directory:', err.message);
      return;
    }

    files
      .filter((file) => file.endsWith('.json'))
      .forEach((file) => {
        const filePath = path.join(logDir, file);
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(
              `Failed to delete JSON log file ${file}:`,
              err.message,
            );
          }
        });
      });
  });
});

export const AppLogger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(
      ({ timestamp, level, message }) =>
        `${timestamp} [${level.toUpperCase()}]: ${message}`,
    ),
  ),
  transports: [new transports.Console(), rotateTransport],
});
