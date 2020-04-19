import { EveryJob } from './every-job';
import { OnceJob } from './once-job';

export type Job = OnceJob | EveryJob;
