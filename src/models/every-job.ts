import { BaseJob } from './base-job';

export type EveryJob = {
    type: 'every',
    interval: string
} & BaseJob;
