export type Role = "ADMIN" | "USER" | "OWNER";

export type ProjectStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "DELETED";

export type InvestmentStatus = "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN" | "DELETED";

export interface Pagination {
  total: number;
  currentPage: number;
  limit: number;
  totalPages: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  ownerId: string;
  categoryId: string;
  title: string;
  slug: string;
  description: string;
  targetAmount: number | string;
  raisedAmount: number | string;
  status: ProjectStatus;
  imageUrl?: string | null;
  category?: Category;
  owner?: User;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvestmentRequest {
  id: string;
  projectId: string;
  investorId: string;
  reviewerId?: string | null;
  amount: number | string;
  message?: string | null;
  status: InvestmentStatus;
  project?: Project;
  investor?: User;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}
