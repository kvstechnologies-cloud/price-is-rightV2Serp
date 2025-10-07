// Shared types for audit and persistence system

export interface User {
  id: string;
  email?: string;
  name?: string;
  authProvider?: string;
}

export interface FileMeta {
  id: string;
  bucket: string;
  s3Key: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256?: string;
  fileType: 'csv' | 'xlsx' | 'image';
}

export interface JobMeta {
  id: string;
  jobType: 'SINGLE' | 'CSV' | 'IMAGE';
  status: 'QUEUED' | 'RUNNING' | 'PARTIAL_SUCCESS' | 'SUCCESS' | 'FAILED';
  inputText?: string;
  fileId?: string;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export interface JobItem {
  id: string;
  rowIndex?: number;
  imageRef?: string;
  inputDesc: string;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'ERROR';
  errorMessage?: string;
}

export interface SearchResult {
  sourceDomain: string;
  productTitle: string;
  price?: number;
  currency?: string;
  url: string;
  validated?: boolean;
  validatedPrice?: number;
  validationMethod?: string;
  isTrustedDomain?: boolean;
  consideredRank?: number;
}

export interface FinalChoice {
  sourceDomain: string;
  productTitle: string;
  price?: number;
  currency?: string;
  url: string;
  validated?: boolean;
  validatedPrice?: number;
  validationMethod?: string;
  isTrustedDomain?: boolean;
  reason?: string;
}

export interface SearchEvent {
  engine: 'serpapi' | 'cse' | 'scraper';
  queryText: string;
  startedAt: Date;
  completedAt?: Date;
  success: boolean;
  errorMessage?: string;
  results: SearchResult[];
}

export interface SingleSearchInput {
  text: string;
  choice: FinalChoice;
  allResults: SearchResult[];
}

export interface FileJobInput {
  fileMeta: FileMeta;
  jobMeta: JobMeta;
  items: JobItem[];
}

export interface ImageJobInput {
  fileMeta: FileMeta;
  jobMeta: JobMeta;
  items: JobItem[];
}

export interface AuditLogInput {
  action: 'SEARCH_SINGLE' | 'UPLOAD_FILE' | 'PROCESS_ROW' | 'RETRY' | 'VIEW_DASHBOARD';
  metaJson: Record<string, any>;
}

// Dashboard response types
export interface JobSummary {
  id: string;
  jobType: 'SINGLE' | 'CSV' | 'IMAGE';
  status: 'QUEUED' | 'RUNNING' | 'PARTIAL_SUCCESS' | 'SUCCESS' | 'FAILED';
  createdAt: Date;
  completedAt?: Date;
  totalItems: number;
  completedItems: number;
  errorItems: number;
  successRate: number;
}

export interface DashboardSummary {
  totalJobs: number;
  jobsByType: Record<string, number>;
  jobsByStatus: Record<string, number>;
  successRate: number;
  averageDuration: number;
  topDomains: Array<{ domain: string; count: number }>;
  averagePriceDelta: number;
}

// Pagination types
export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
  total: number;
}
