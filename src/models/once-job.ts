import { BaseJob } from './base-job';

export type OnceJob = {
    type: 'once',
    when: Date
} & BaseJob;
