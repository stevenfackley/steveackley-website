// =============================================================================
// Shared TypeScript Types
// =============================================================================

// --- Blog Post Types ---------------------------------------------------------

export interface PostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostFull extends PostSummary {
  content: string;
}

// --- Pagination Types --------------------------------------------------------

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PaginatedPosts {
  posts: PostSummary[];
  pagination: PaginationInfo;
}

// --- Project Types -----------------------------------------------------------

export type ProjectStatus = "active" | "coming-soon";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  href?: string;
  tech?: string[];
}

// --- API Response Types ------------------------------------------------------

export interface ApiResponse<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UploadResponse {
  url: string;
}

// --- Form Types --------------------------------------------------------------

export interface PostFormData {
  title: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  published: boolean;
}

export interface LoginFormData {
  email: string;
  password: string;
}

// --- Action Result Types -----------------------------------------------------

export interface ActionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}
