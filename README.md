# Admin Dashboard

A modern, full-stack admin dashboard built with Next.js 15, TypeScript, and Tailwind CSS with advanced RBAC (Role-Based Access Control).

## Features

- **Next.js 15** with App Router
- **Advanced RBAC System** with granular permissions
- **NextAuth.js** with JWT authentication
- **Modern UI** with Tailwind CSS and Radix UI
- **TypeScript** for type safety
- **Nest.js Backend** compatible

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env.local` and configure:
```env
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:5005
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/              # Next.js app router pages
├── components/       # React components
├── contexts/         # React contexts
├── hooks/           # Custom React hooks
├── lib/             # Utility functions and API clients
├── rbac/            # RBAC permission system
├── services/        # API service layer
├── stores/          # Zustand state management
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
```

## RBAC System

The application includes a comprehensive RBAC system with:
- Entity-level permissions (CRUD operations)
- Route-level guards
- Navigation guards
- Permission hooks for UI components

## License

Private
