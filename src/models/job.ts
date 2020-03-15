export type Job = {
    id?: string;
    interval: string;
    nextRunAt: Date,
    target: {
        url: string;
        method: string;
        headers?: {
            [key: string]: string;
        },
        body: object
    };
};
