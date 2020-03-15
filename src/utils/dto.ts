import Agenda, { JobAttributesData } from 'agenda';
import { Job } from '../models/Job';

export function toDto(item: Agenda.Job<JobAttributesData>): Job {
    if (!item) {
        return item;
    }
    const { attrs } = item;
    const { _id, data, repeatInterval, nextRunAt } = attrs;
    const { url, method, headers, body } = data;
    return { 
        id: _id.toString(),
        interval: repeatInterval.toString(),
        nextRunAt,
        target: {
            url,
            method,
            headers,
            body
        }
    };
}
