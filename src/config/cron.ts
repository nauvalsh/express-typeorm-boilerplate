import { CronJob } from 'cron';
import schedulerClosingSvc from '~/services/schedulerClosingSvc';
import * as common from '~/utils/common';
import logger from '~/utils/logger';

const CRON_PATTERN = {
  every10s: '*/10 * * * * *',
  every7am: '15 7 * * *',
};

export const cronBigDataClosing = async () => {
  await schedulerClosingSvc.schedulerClosing();
  await schedulerClosingSvc.schedulerClosingTabemas();
  await schedulerClosingSvc.schedulerDeleteActivity();
};

const cronJob: CronJob = new CronJob(CRON_PATTERN.every7am, async () => {
  try {
    logger.info('CRON', common.tanggal(new Date(), true));
    await cronBigDataClosing();
  } catch (e) {
    logger.error(common.tanggal(new Date(), true), 'CRON');
  }
});

export default cronJob;
