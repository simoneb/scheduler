import Agenda, { JobAttributesData } from 'agenda';
import { Job } from '../models/job';

export function toDto(item: Agenda.Job<JobAttributesData>): Job {
    if (!item) {
        return item;
    }
    const { attrs } = item;
    const { _id, data, repeatInterval, nextRunAt } = attrs;
    const { url, method, headers, body } = data;
    if (repeatInterval) {
        return {
            id: _id.toString(),
            type: 'every',
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
    return {
        id: _id.toString(),
        type: 'once',
        when: nextRunAt,
        nextRunAt,
        target: {
            url,
            method,
            headers,
            body
        }
    };
}
