# Admin Dashboard - Setup Guide

This is the final upgraded frontend combining the best features from both projects with a modern RBAC system and Nest.js backend compatibility.

## Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- Nest.js backend running (default: http://localhost:5005)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 2. Environment Configuration

Create a `.env.local` file in the root directory:

```env
NEXTAUTH_SECRET=your_secret_key_here_min_32_characters
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:5005
```

**Important:** Generate a secure secret key:
```bash
openssl rand -base64 32
```

### 3. Start Development Server

```bash
npm run dev
# or
pnpm dev
```

The application will be available at http://localhost:3000

## Project Structure

```
final-upgraded-frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (dashboard)/        # Dashboard route group
│   │   ├── login/              # Login page
│   │   └── layout.tsx          # Root layout
│   ├── components/             # React components
│   │   ├── ui/                 # UI components (Button, Input, etc.)
│   │   ├── sidebar.tsx         # Navigation sidebar
│   │   ├── topbar.tsx          # Top navigation bar
│   │   └── permission-gate.tsx # Permission guard component
│   ├── contexts/               # React contexts
│   │   └── AuthContext.tsx    # Authentication context
│   ├── rbac/                   # RBAC system
│   │   ├── permissions-map.ts  # Entity permissions mapping
│   │   ├── link-permissions.ts # Navigation permissions
│   │   └── use-rbac.ts        # RBAC hooks
│   ├── lib/                    # Utilities
│   │   ├── api-client.ts      # Axios client with interceptors
│   │   ├── auth.ts            # Auth service
│   │   └── utils.ts           # Helper functions
│   ├── services/              # API services
│   ├── types/                 # TypeScript types
│   └── utils/                 # Utility constants
├── auth.ts                    # NextAuth configuration
├── middleware.ts              # Next.js middleware for auth
└── package.json
```

## Key Features

### 1. RBAC System

The application includes a comprehensive RBAC system with:
- **Entity-level permissions** (CRUD operations)
- **Route-level guards**
- **Navigation guards** (sidebar links)
- **Permission hooks** for component-level access control

Usage example:
```tsx
import { useEntityPerms } from "@/rbac/use-rbac";

function MyComponent() {
  const { canCreate, canUpdate, canDelete } = useEntityPerms("users");
  
  return (
    <>
      {canCreate && <CreateButton />}
      {canUpdate && <UpdateButton />}
      {canDelete && <DeleteButton />}
    </>
  );
}
```

### 2. Authentication Flow

1. User logs in via `/login`
2. Credentials sent to Nest.js backend `/auth/login`
3. Backend returns JWT token + refresh token + user permissions
4. Tokens stored in cookies and localStorage
5. Automatic token refresh before expiration
6. Permissions loaded and used for RBAC

### 3. API Client

The API client includes:
- Automatic token attachment to requests
- Token refresh on 401 errors
- Request/response interceptors
- Error handling

### 4. Nest.js Backend Compatibility

Expected backend API structure:

**Login Endpoint:** `POST /auth/login`
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "status": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": {
        "id": "1",
        "name": "Admin",
        "slug": "admin"
      }
    },
    "token": "jwt_access_token",
    "refresh_token": "jwt_refresh_token",
    "expires_at": "2025-01-01T00:00:00Z",
    "modulesWithPermisssions": [
      {
        "module_name": "Users",
        "module_slug": "users",
        "permissions": [
          {
            "route": "users/getAll",
            "is_allowed": true,
            "is_Show_in_menu": true,
            "permission_name": "View Users",
            "permission_slug": "users-view"
          }
        ]
      }
    ]
  }
}
```

## Building for Production

```bash
npm run build
npm start
```

## Common Issues

### 1. Module not found errors
Solution: Run `npm install` to install all dependencies

### 2. NEXTAUTH_SECRET error
Solution: Set a valid 32+ character secret in `.env.local`

### 3. API connection errors
Solution: Verify `NEXT_PUBLIC_API_URL` points to your running backend

### 4. Permission errors
Solution: Ensure backend returns permissions in the correct format

## Development Tips

1. **Hot Reload:** The dev server auto-reloads on file changes
2. **TypeScript:** All type errors must be resolved before production build
3. **Permissions:** Update `src/rbac/permissions-map.ts` to add new entities
4. **API Services:** Add new services in `src/services/` folder

## Support

For issues or questions, refer to the codebase documentation or backend API documentation.
