export type BaseJob = {
    id?: string;
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
