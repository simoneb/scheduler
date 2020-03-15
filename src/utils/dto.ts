import Agenda, { JobAttributesData } from 'agenda';
import { Job } from '../models/Job';

export function toDto(item: Agenda.Job<JobAttributesData>): Job {
    if (!item) {
        return item;
    }
    const { _id, ...rest } = item.attrs;
    return { url: rest.data.url, id: _id.toString(), interval: rest.repeatInterval.toString() };
}
