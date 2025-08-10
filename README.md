# AxonStreamAI - Universal AI Orchestration Operating System

## 🚀 Overview

AxonStreamAI is a production-grade AI orchestration platform that allows users to configure, connect, and deploy AI agents and tools through an intuitive workflow builder interface. Built as a monorepo with NestJS backend and Next.js frontend, it provides enterprise-level security, real-time collaboration, and seamless integration capabilities.

## 🏗️ Architecture

### Core Components

- **Workflow Builder**: Drag-and-drop interface inspired by n8n.io with React Flow integration
- **Real-time Event System**: WebSocket-based AxonPuls protocol for bidirectional streaming
- **Multi-Provider AI Integration**: Smart routing system supporting OpenAI, Claude, Gemini, Mistral
- **Enterprise Security**: JWT authentication, multi-tenant isolation, RBAC permissions
- **Embeddable Components**: SDK for embedding agents/workflows as widgets

### Technology Stack

#### Backend (NestJS)
- **Framework**: NestJS with Fastify adapter
- **Database**: PostgreSQL with TypeORM
- **Cache**: Redis for session management and caching
- **Real-time**: Socket.IO for WebSocket connections
- **Authentication**: JWT with Passport.js
- **API Documentation**: Swagger/OpenAPI

#### Frontend (Next.js)
- **Framework**: Next.js 14 with App Router
- **UI Library**: Tailwind CSS + shadcn/ui components
- **State Management**: React Context + Custom hooks
- **Workflow Editor**: React Flow for visual workflow building
- **Real-time**: Socket.IO client for live updates

#### Shared Packages
- **Types**: Shared TypeScript interfaces and types
- **Schemas**: Zod validation schemas
- **Utilities**: Common utility functions

## 📁 Project Structure

```
axonstream-ai/
├── apps/
│   ├── backend/                 # NestJS API Server
│   │   ├── src/
│   │   │   ├── auth/           # Authentication module
│   │   │   ├── workflows/      # Workflow management
│   │   │   ├── websockets/     # Real-time communication
│   │   │   ├── ai-providers/   # AI service integrations
│   │   │   ├── database/       # Database entities & migrations
│   │   │   ├── config/         # Configuration files
│   │   │   └── common/         # Shared utilities
│   │   └── package.json
│   └── frontend/               # Next.js Web Application
│       ├── src/
│       │   ├── app/           # Next.js App Router pages
│       │   ├── components/    # React components
│       │   ├── lib/          # Utility libraries
│       │   └── types/        # Frontend-specific types
│       └── package.json
├── packages/
│   └── shared/                 # Shared code between apps
│       ├── src/
│       │   ├── types/         # Shared TypeScript types
│       │   ├── schemas/       # Zod validation schemas
│       │   └── utils/         # Common utilities
│       └── package.json
├── docs/                      # Documentation
├── docker/                    # Docker configurations
├── scripts/                   # Build and deployment scripts
└── package.json              # Root workspace configuration
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 14
- Redis >= 6.0

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd axonstream-ai
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Environment Setup**
   
   Create `.env` files in both apps:
   
   **Backend (.env)**
   ```env
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=your_password
   DB_NAME=axonstream
   
   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   
   # JWT
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=7d
   
   # API Keys
   OPENAI_API_KEY=your_openai_key
   CLAUDE_API_KEY=your_claude_key
   GEMINI_API_KEY=your_gemini_key
   
   # Server
   PORT=3001
   FRONTEND_URL=http://localhost:3000
   ```
   
   **Frontend (.env.local)**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   NEXT_PUBLIC_WS_URL=ws://localhost:3001
   ```

4. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb axonstream
   
   # Run migrations (from backend directory)
   cd apps/backend
   npm run migration:run
   ```

5. **Start Development Servers**
   ```bash
   # From root directory
   npm run dev
   ```

   This starts both backend (port 3001) and frontend (port 3000) concurrently.

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev                    # Start both apps in development mode
npm run dev:backend           # Start only backend
npm run dev:frontend          # Start only frontend

# Building
npm run build                 # Build all packages and apps
npm run build:backend         # Build backend only
npm run build:frontend        # Build frontend only
npm run build:shared          # Build shared package only

# Production
npm run start                 # Start both apps in production mode
npm run start:backend         # Start backend in production
npm run start:frontend        # Start frontend in production

# Testing & Linting
npm run test                  # Run tests in all workspaces
npm run lint                  # Lint all workspaces
npm run clean                 # Clean all node_modules
```

### Workflow Development

1. **Backend API Development**
   - Add new endpoints in respective modules
   - Use TypeORM entities for database operations
   - Implement WebSocket events for real-time features
   - Add Swagger documentation

2. **Frontend Component Development**
   - Use shadcn/ui components for consistency
   - Implement React Flow nodes for workflow builder
   - Connect to backend APIs using custom hooks
   - Handle real-time updates via Socket.IO

3. **Shared Package Updates**
   - Update types when adding new features
   - Add validation schemas for API contracts
   - Build shared package before testing

## 🔧 Configuration

### Backend Configuration

The backend uses a modular configuration system:

- `database.config.ts` - Database connection settings
- `redis.config.ts` - Redis connection settings
- `auth.config.ts` - Authentication settings
- `ai-providers.config.ts` - AI service configurations

### Frontend Configuration

- `next.config.js` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `components.json` - shadcn/ui configuration

## 🔐 Security Features

- **Authentication**: JWT-based authentication with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: Input validation, SQL injection prevention
- **Rate Limiting**: API rate limiting and DDoS protection
- **Audit Logging**: Comprehensive audit trails
- **Multi-tenancy**: Isolated data per organization

## 🌐 API Documentation

Once the backend is running, access the Swagger documentation at:
`http://localhost:3001/api/docs`

## 🚀 Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Production Deployment

1. Build all packages: `npm run build`
2. Set production environment variables
3. Run database migrations
4. Start services: `npm run start`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation in `/docs`
- Review the API documentation at `/api/docs`