import fs from 'fs/promises';
import path from 'path';
import { Job } from '../types';
import { JobStore } from './job-store';
import { Logger } from '../utils/logger';
import { validateJobId } from '../utils/security';

const logger = new Logger('FilesystemJobStore');

export class FilesystemJobStore implements JobStore {
  private metadataPath: string;

  constructor(basePath: string) {
    this.metadataPath = path.join(basePath, 'metadata');
    this.ensureDirectory();
  }

  private async ensureDirectory() {
    await fs.mkdir(this.metadataPath, { recursive: true });
  }

  private getJobPath(jobId: string): string {
    if (!validateJobId(jobId)) {
      throw new Error('Invalid job ID');
    }
    return path.join(this.metadataPath, `${jobId}.json`);
  }

  async createJob(job: Job): Promise<void> {
    const jobPath = this.getJobPath(job.id);
    await fs.writeFile(jobPath, JSON.stringify(job, null, 2));
    logger.info('Job created', { jobId: job.id });
  }

  async getJob(jobId: string): Promise<Job | null> {
    const jobPath = this.getJobPath(jobId);
    try {
      const data = await fs.readFile(jobPath, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async updateJob(jobId: string, updates: Partial<Job>): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const updatedJob = {
      ...job,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const jobPath = this.getJobPath(jobId);
    await fs.writeFile(jobPath, JSON.stringify(updatedJob, null, 2));
    logger.debug('Job updated', { jobId, updates: Object.keys(updates) });
  }

  async deleteJob(jobId: string): Promise<void> {
    const jobPath = this.getJobPath(jobId);
    try {
      await fs.unlink(jobPath);
      logger.info('Job deleted', { jobId });
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async listJobs(): Promise<Job[]> {
    const files = await fs.readdir(this.metadataPath);
    const jobs: Job[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const jobId = file.replace('.json', '');
        const job = await this.getJob(jobId);
        if (job) {
          jobs.push(job);
        }
      }
    }

    return jobs;
  }

  async findJobsByStatus(status: Job['status']): Promise<Job[]> {
    const allJobs = await this.listJobs();
    return allJobs.filter(job => job.status === status);
  }
}