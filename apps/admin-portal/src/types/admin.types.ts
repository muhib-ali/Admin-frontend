export interface AdminRole {
  id: string;
  title: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RolesListResponse {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: {
    roles: AdminRole[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
      nextPage: number | null;
      prevPage: number | null;
    };
  };
}

export interface RoleItemResponse {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: AdminRole;
}

export type RolePermItem = {
  id: string;
  permission_slug: string;
  is_allowed: boolean;
};

export type RoleModulePerm = {
  module_slug: string;
  permissions: RolePermItem[];
};

export interface RolePermsResponse {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: {
    modulesWithPermisssions: RoleModulePerm[];
  };
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsersListResponse {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: {
    users: AdminUser[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
      nextPage: number | null;
      prevPage: number | null;
    };
  };
}

export interface UserItemResponse {
  statusCode: number;
  status: boolean;
  message: string;
  heading: string;
  data: AdminUser;
}
