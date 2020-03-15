export type Job = {
    id?: string;
    interval: string;
    nextRunAt: Date,
    target: {
        url: string;
        method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
        headers?: {
            [key: string]: string;
        },
        body: object
    };
};
