# Architecture Overview

## Overview

This repository contains a Supermarket Audio Broadcasting System - a full-stack web application designed to manage and schedule audio broadcasts across multiple supermarket locations. The system allows users to upload audio files, create broadcast programs, build playlists, and assign broadcasts to specific supermarkets based on scheduling requirements.

The application follows a client-server architecture with a React frontend and Node.js Express backend. It uses PostgreSQL for data persistence and follows RESTful API design principles for communication between client and server.

## System Architecture

### High-Level Architecture

The application follows a three-tier architecture:

1. **Presentation Layer**: React-based single-page application
2. **Application Layer**: Express.js server handling business logic and API routes
3. **Data Layer**: PostgreSQL database accessed via Drizzle ORM

### Technical Stack

- **Frontend**: React with TypeScript, using a custom UI component library based on Radix UI
- **Backend**: Node.js with Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **State Management**: React Query for server state
- **Styling**: Tailwind CSS with CSS variables for theming
- **Authentication**: Session-based authentication with Passport.js
- **Build Tools**: Vite, esbuild

## Key Components

### Frontend Components

1. **Authentication Module**
   - Handles user login, registration, and session management
   - Implemented through `AuthProvider` context in `use-auth.tsx`

2. **Dashboard**
   - Main interface showing system statistics and recent activities
   - Provides navigation to other application modules

3. **User Management**
   - Interface for managing users, roles, and permissions
   - Supports creating, editing, and deactivating user accounts

4. **Supermarket Management**
   - Interface for managing supermarket locations
   - Organized hierarchically by region, province, and commune

5. **Audio File Management**
   - Supports uploading, categorizing, and previewing audio files
   - Includes an audio player component for playback

6. **Broadcast Program Management**
   - Interface for creating and managing broadcast programs
   - Includes calendar-based scheduling and frequency settings

7. **Playlist Creation**
   - Interface for creating and managing playlists of audio files
   - Supports ordering, preview, and assigning playlists to broadcasts

8. **Broadcast Assignment**
   - Associates broadcast programs with specific supermarket locations
   - Handles scheduling and activation of broadcasts

### Backend Components

1. **Server Core**
   - Entry point (`server/index.ts`) that sets up Express server
   - Configures middleware, routes, and error handling

2. **Authentication System**
   - Implemented in `server/auth.ts` using Passport.js
   - Provides session-based authentication with secure password handling

3. **Database Access Layer**
   - Connection management through `server/db.ts`
   - Data access through the `storage` interface in `server/storage.ts`
   - Concrete implementation in `server/database-storage.ts`

4. **API Routes**
   - RESTful endpoints defined in `server/routes.ts` and specialized route files
   - Structured by domain (users, supermarkets, audio files, broadcasts, etc.)

5. **File Management**
   - Handles upload and storage of audio files
   - Uses multer for file processing

### Database Schema

The database schema is defined in `shared/schema.ts` using Drizzle ORM and includes the following key entities:

1. **Users**
   - Authentication and access control information
   - Role-based permissions (admin, manager, user)

2. **Activity Logs**
   - Audit trail of user actions in the system

3. **Geographical Hierarchy**
   - Regions, provinces, and communes
   - Forms the location structure for supermarkets

4. **Supermarkets**
   - Store information including address and geographical location

5. **Audio Files**
   - Metadata for uploaded audio content
   - References to physical files stored on the server

6. **Broadcast Programs**
   - Scheduling information for broadcasts
   - Frequency settings for playback

7. **Playlists**
   - Collections of audio files in specific order
   - Associated with broadcast programs

8. **Broadcast Assignments**
   - Links between supermarkets and broadcast programs
   - Controls which broadcasts play at which locations

## Data Flow

1. **Authentication Flow**
   - Client sends credentials to server
   - Server validates and creates session
   - Session token stored in cookie
   - Subsequent requests include the session cookie

2. **Audio Management Flow**
   - User uploads audio file
   - Server processes and stores file
   - Metadata saved to database
   - Files available for inclusion in playlists

3. **Broadcast Programming Flow**
   - User creates a broadcast program
   - User builds a playlist from available audio files
   - Program is scheduled with frequency parameters
   - Program is assigned to specific supermarkets

4. **Broadcast Execution**
   - System determines which broadcasts should play at which supermarkets
   - Playlists are retrieved and processed based on scheduling rules
   - Audio is played according to the program schedule

## External Dependencies

### Frontend Dependencies

- **@radix-ui** components for accessible UI elements
- **@tanstack/react-query** for server state management
- **class-variance-authority** and **clsx** for CSS class composition
- **howler** for audio playback
- **date-fns** for date manipulation
- **wouter** for client-side routing

### Backend Dependencies

- **express** for HTTP server and middleware
- **passport** for authentication
- **drizzle-orm** for database access
- **multer** for file uploads
- **connect-pg-simple** for PostgreSQL session storage
- **zod** for schema validation

## Deployment Strategy

The application is configured for deployment on Replit, with specific settings in the `.replit` file:

### Development Environment

- Uses `npm run dev` for local development
- Vite provides hot module replacement
- Development-specific error handling and logging

### Production Build

- `npm run build` compiles frontend assets with Vite
- Backend code is bundled with esbuild
- Output placed in the `dist` directory

### Production Runtime

- `npm run start` runs the production build
- Environment variables control configuration
- PostgreSQL database accessed via connection string

### Database Management

- Schema migrations managed through Drizzle Kit
- `db:push` script updates database schema

### Scaling Considerations

- Stateless application design supports horizontal scaling
- Session storage in database allows for multiple server instances
- Static assets can be served from CDN if needed

## Security Considerations

1. **Authentication**
   - Secure password hashing using scrypt
   - Session-based authentication with secure cookies
   - Role-based authorization for API endpoints

2. **Input Validation**
   - Request validation using Zod schemas
   - Sanitization of file uploads

3. **Database Security**
   - Parameterized queries through Drizzle ORM
   - Connection pooling for efficient resource usage

4. **Frontend Security**
   - CSRF protection through secure cookies
   - Content security through proper sanitization