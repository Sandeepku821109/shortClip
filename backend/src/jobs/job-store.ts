import { Job } from '../types';

export interface JobStore {
  /**
   * Create a new job
   */
  createJob(job: Job): Promise<void>;

  /**
   * Get a job by ID
   */
  getJob(jobId: string): Promise<Job | null>;

  /**
   * Update a job
   */
  updateJob(jobId: string, updates: Partial<Job>): Promise<void>;

  /**
   * Delete a job
   */
  deleteJob(jobId: string): Promise<void>;

  /**
   * List all jobs
   */
  listJobs(): Promise<Job[]>;

  /**
   * Find jobs by status
   */
  findJobsByStatus(status: Job['status']): Promise<Job[]>;
}