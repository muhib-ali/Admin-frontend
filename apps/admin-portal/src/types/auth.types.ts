export interface Role {
  id: string;
  name: string;
  slug: string;
}

export interface Permission {
  route: string;
  is_allowed: boolean;
  is_Show_in_menu: boolean;
  permission_name: string;
  permission_slug: string;
}

export interface Module {
  module_name: string;
  module_slug: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    refresh_token: string;
    expires_at: string;
    modulesWithPermisssions: Module[];
  };
}
