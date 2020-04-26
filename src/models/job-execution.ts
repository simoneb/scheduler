export type JobExecution = {
    id: string,
    createdAt: Date,
    jobId: string,
    success: boolean,
    failureReason?: string
}
