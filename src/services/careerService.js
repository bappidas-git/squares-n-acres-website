/**
 * Careers: the job postings and the applications they receive
 * (00_MASTER_CONTEXT.md §6.11, D12, D91).
 */

import { endpoints } from './endpoints';
import http from './http';

/* Public */

export const jobs = (params, opts) => http.request(endpoints.jobs.list, { params, ...opts });

export const jobBySlug = (slug, opts) =>
  http.request(endpoints.jobs.bySlug, { pathParams: { slug }, ...opts });

/** `{ name, email, phone, resumeUrl, coverLetter?, linkedinUrl?, website? }`. */
export const apply = (id, body, opts) =>
  http.request(endpoints.jobs.apply, { pathParams: { id }, body, ...opts });

/* Admin — postings */

export const adminJobList = (params, opts) =>
  http.request(endpoints.adminJobs.list, { params, ...opts });

export const adminJobGet = (id, opts) =>
  http.request(endpoints.adminJobs.get, { pathParams: { id }, ...opts });

export const createJob = (body, opts) =>
  http.request(endpoints.adminJobs.create, { body, ...opts });

export const updateJob = (id, body, opts) =>
  http.request(endpoints.adminJobs.update, { pathParams: { id }, body, ...opts });

export const patchJob = (id, body, opts) =>
  http.request(endpoints.adminJobs.patch, { pathParams: { id }, body, ...opts });

export const removeJob = (id, opts) =>
  http.request(endpoints.adminJobs.remove, { pathParams: { id }, ...opts });

export const bulkJobs = (body, opts) => http.request(endpoints.adminJobs.bulk, { body, ...opts });

export const checkJobSlug = (params, opts) =>
  http.request(endpoints.adminJobs.checkSlug, { params, ...opts });

/* Admin — applications */

export const adminApplicationList = (params, opts) =>
  http.request(endpoints.adminJobApplications.list, { params, ...opts });

export const patchApplication = (id, body, opts) =>
  http.request(endpoints.adminJobApplications.patch, { pathParams: { id }, body, ...opts });

export const removeApplication = (id, opts) =>
  http.request(endpoints.adminJobApplications.remove, { pathParams: { id }, ...opts });

const careerService = {
  jobs,
  jobBySlug,
  apply,
  adminJobList,
  adminJobGet,
  createJob,
  updateJob,
  patchJob,
  removeJob,
  bulkJobs,
  checkJobSlug,
  adminApplicationList,
  patchApplication,
  removeApplication,
};

export default careerService;
