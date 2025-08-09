---
description:
globs:
alwaysApply: false
---


Fantastic — I’ll generate a **ready-to-commit, production-oriented** set of NestJS files you can drop into your monorepo to get **Tenants → Auth → Users → Roles → Sessions** up and running.

Important notes up front:

* This uses **Zod** for runtime validation (you asked for Zod everywhere).
* **PrismaService** is assumed to be available (I include a lightweight `prisma.service.ts`).
* JWTs are signed/verified with **RS256** using keys from environment (use Vault/KMS in prod — **do not** commit keys).
* Sessions are persisted in Postgres (via Prisma) and cached in Redis for fast lookups.
* RBAC uses permission strings (`resource:action`) stored on `Role.permissions`.
* I keep services modular and DI-friendly so you can expand (AxonPulse integration, Redis Streams, workers) later.

Below are the files (copy-paste into `apps/backend/src/...`). I’ve structured them minimal-but-complete so you can run locally after `npm install` and configuring env.

---

# 1) `package.json` (relevant deps)

```json
{
  "name": "axonstream-backend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "start:dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main.js"
  },
  "dependencies": {
    "@prisma/client": "^4.0.0",
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-fastify": "^10.0.0",
    "fastify": "^4.0.0",
    "zod": "^3.0.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.0.1",
    "ioredis": "^5.0.0",
    "reflect-metadata": "^0.1.13"
  },
  "devDependencies": {
    "prisma": "^4.0.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/bcrypt": "^5.0.0",
    "ts-node": "^10.0.0",
    "typescript": "^5.0.0",
    "@nestjs/cli": "^10.0.0"
  }
}
```

---

# 2) Environment variables (example `.env`)

```
DATABASE_URL="postgresql://user:pass@localhost:5432/axonstream?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_PRIVATE_KEY_PATH=/secrets/jwt_access_private.pem
JWT_ACCESS_PUBLIC_KEY_PATH=/secrets/jwt_access_public.pem
JWT_REFRESH_PRIVATE_KEY_PATH=/secrets/jwt_refresh_private.pem
JWT_REFRESH_PUBLIC_KEY_PATH=/secrets/jwt_refresh_public.pem
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
BCRYPT_SALT_ROUNDS=12
```

> **Production:** mount keys from Vault/KMS. Never put private keys in repository.

---

# 3) Shared Zod schemas — `packages/core/src/schemas/auth.ts`

Place in your shared package; controllers import from this path.

```ts
// packages/core/src/schemas/auth.ts
import { z } from 'zod';

export const OrganizationCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  settings: z.record(z.any()).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  organizationSlug: z.string().optional(),
});

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(2).optional(),
  organizationSlug: z.string().regex(/^[a-z0-9-]+$/).optional(),
});

export const PermissionCheckSchema = z.object({
  userId: z.string().cuid(),
  resource: z.string(),
  action: z.string(),
  scope: z.record(z.any()).optional(),
});
```

---

# 4) `prisma.service.ts` — Prisma wrapper

`apps/backend/src/prisma/prisma.service.ts`

```ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

---

# 5) `main.ts` — Nest entry (Fastify)

`apps/backend/src/main.ts`

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { fastify } from 'fastify';
import helmet from '@fastify/helmet';

async function bootstrap() {
  const server = fastify();
  const app = await NestFactory.create(AppModule, server);
  await app.register(helmet);
  app.setGlobalPrefix('/api/v1');
  await app.listen({ port: process.env.PORT ? parseInt(process.env.PORT) : 3000, host: '0.0.0.0' });
  console.log('API listening on port', process.env.PORT ?? 3000);
}
bootstrap();
```

---

# 6) Root module `app.module.ts`

`apps/backend/src/app.module.ts`

```ts
import { Module, MiddlewareConsumer } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { TenantsModule } from './modules/tenants/tenants.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { TenantMiddleware } from './modules/tenants/tenant.middleware';
import { SessionsModule } from './modules/sessions/sessions.module';

@Module({
  imports: [TenantsModule, AuthModule, UsersModule, RolesModule, SessionsModule],
  providers: [PrismaService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
```

---

# 7) Tenants module

`apps/backend/src/modules/tenants/tenants.module.ts`

```ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';

@Module({
  providers: [PrismaService, TenantsService],
  controllers: [TenantsController],
  exports: [TenantsService],
})
export class TenantsModule {}
```

`apps/backend/src/modules/tenants/tenants.service.ts`

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.organization.findUnique({ where: { id } });
  }

  async findBySlugOrId(value: string) {
    return this.prisma.organization.findFirst({
      where: { OR: [{ id: value }, { slug: value }] },
    });
  }

  async create(data: { name: string; slug?: string; settings?: any }) {
    return this.prisma.organization.create({ data: { name: data.name, slug: data.slug ?? undefined, settings: data.settings ?? {} }});
  }
}
```

`apps/backend/src/modules/tenants/tenants.controller.ts`

```ts
import { Controller, Post, Body } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { OrganizationCreateSchema } from '../../../../packages/core/src/schemas/auth';

@Controller('tenants')
export class TenantsController {
  constructor(private tenants: TenantsService) {}

  @Post()
  async create(@Body() body: any) {
    const data = OrganizationCreateSchema.parse(body);
    return this.tenants.create({ name: data.name, slug: data.slug, settings: data.settings });
  }
}
```

`apps/backend/src/modules/tenants/tenant.middleware.ts`

```ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantsService } from './tenants.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private tenantsService: TenantsService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const header = (req.headers['x-tenant-id'] as string) || (req.headers['x-organization-slug'] as string);
    if (header) {
      const tenant = await this.tenantsService.findBySlugOrId(header);
      if (tenant) (req as any).tenant = tenant;
    }
    return next();
  }
}
```

---

# 8) Sessions module (session storage + caching)

`apps/backend/src/modules/sessions/sessions.module.ts`

```ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionService } from './sessions.service';

@Module({
  providers: [PrismaService, SessionService],
  exports: [SessionService],
})
export class SessionsModule {}
```

`apps/backend/src/modules/sessions/sessions.service.ts`

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Redis from 'ioredis';

@Injectable()
export class SessionService {
  private redis = new Redis(process.env.REDIS_URL);

  constructor(private prisma: PrismaService) {}

  async createSession(data: {
    id: string;
    userId: string;
    token: string;
    refreshToken: string;
    ip?: string;
    deviceInfo?: any;
    expiresAt: Date;
  }) {
    await this.prisma.session.create({
      data: {
        id: data.id,
        userId: data.userId,
        token: data.token,
        refreshToken: data.refreshToken,
        deviceInfo: data.deviceInfo ?? {},
        ipAddress: data.ip ?? null,
        expiresAt: data.expiresAt,
      },
    });

    // Cache in redis for quick lookup & revocation checks
    const key = `session:${data.id}`;
    await this.redis.hset(key, {
      userId: data.userId,
      token: data.token,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt.toISOString(),
    });
    await this.redis.expireat(key, Math.floor(data.expiresAt.getTime() / 1000));
    return { ok: true };
  }

  async findByRefreshToken(refreshToken: string) {
    return this.prisma.session.findFirst({ where: { refreshToken }});
  }

  async revokeSession(sessionId: string) {
    await this.prisma.session.deleteMany({ where: { id: sessionId }});
    await this.redis.del(`session:${sessionId}`);
  }
}
```

---

# 9) Auth module (core)

`apps/backend/src/modules/auth/auth.module.ts`

```ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionsModule } from '../sessions/sessions.module';
import { SessionService } from '../sessions/sessions.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TenantsModule } from '../tenants/tenants.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TenantsModule, UsersModule, SessionsModule],
  providers: [PrismaService, AuthService, SessionService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

`apps/backend/src/modules/auth/auth.service.ts`

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { SessionService } from '../sessions/sessions.service';
import ms from 'ms';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private sessionService: SessionService) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email }, include: { roles: { include: { role: true } } } });
    if (!user || !user.passwordHash) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    return user;
  }

  private loadKey(path: string) {
    const fs = require('fs');
    return fs.readFileSync(path, 'utf8');
  }

  signAccess(payload: any) {
    const privateKey = this.loadKey(process.env.JWT_ACCESS_PRIVATE_KEY_PATH);
    return jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' });
  }

  signRefresh(payload: any) {
    const privateKey = this.loadKey(process.env.JWT_REFRESH_PRIVATE_KEY_PATH);
    return jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });
  }

  async login(user: any, ip = 'unknown', deviceInfo = {}) {
    const sessionId = randomUUID();
    const roles = (user.roles || []).map((ur) => ur.role.name);
    const accessToken = this.signAccess({ sub: user.id, org: user.organizationId, roles, sessionId });
    const refreshToken = this.signRefresh({ sub: user.id, org: user.organizationId, sessionId });

    const expiresAt = new Date(Date.now() + (ms(process.env.JWT_REFRESH_EXPIRES_IN || '30d')));

    await this.sessionService.createSession({
      id: sessionId,
      userId: user.id,
      token: accessToken,
      refreshToken,
      ip,
      deviceInfo,
      expiresAt,
    });

    return { accessToken, refreshToken, expiresAt, sessionId };
  }

  async refresh(refreshToken: string) {
    try {
      const publicKey = this.loadKey(process.env.JWT_REFRESH_PUBLIC_KEY_PATH);
      const payload: any = jwt.verify(refreshToken, publicKey, { algorithms: ['RS256'] });
      // validate session exists
      const session = await this.sessionService.findByRefreshToken(refreshToken);
      if (!session) throw new UnauthorizedException('Invalid session');
      // rotate access token (no rotation implemented here for simplicity)
      const accessToken = this.signAccess({ sub: payload.sub, org: payload.org, sessionId: payload.sessionId });
      return { accessToken };
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(sessionId: string) {
    await this.sessionService.revokeSession(sessionId);
  }
}
```

`apps/backend/src/modules/auth/auth.controller.ts`

```ts
import { Controller, Post, Body, Req, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginSchema, RegisterSchema } from '../../../../packages/core/src/schemas/auth';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import * as bcrypt from 'bcrypt';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService, private users: UsersService, private tenants: TenantsService) {}

  @Post('register')
  async register(@Body() body: any) {
    const data = RegisterSchema.parse(body);
    let org = null;
    if (data.organizationName) {
      org = await this.tenants.create({ name: data.organizationName, slug: data.organizationSlug });
    }
    const passwordHash = await bcrypt.hash(data.password, parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10));
    const user = await this.users.createUser(org?.id ?? '', data.email, passwordHash);
    // keep it simple: return minimal user (no password)
    return { id: user.id, email: user.email, organizationId: user.organizationId };
  }

  @Post('login')
  async login(@Body() body: any, @Req() req: any) {
    const data = LoginSchema.parse(body);
    const user = await this.auth.validateUser(data.email, data.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.auth.login(user, req.ip, { ua: req.headers['user-agent'] });
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.auth.refresh(refreshToken);
  }

  @Post('logout')
  async logout(@Body('sessionId') sessionId: string) {
    return this.auth.logout(sessionId);
  }
}
```

---

# 10) Users module

`apps/backend/src/modules/users/users.module.ts`

```ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  providers: [PrismaService, UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
```

`apps/backend/src/modules/users/users.service.ts`

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(orgId: string, email: string, passwordHash: string) {
    return this.prisma.user.create({
      data: { email, passwordHash, organizationId: orgId },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async assignRole(userId: string, roleId: string, scope?: any) {
    return this.prisma.userRole.create({ data: { userId, roleId, scope } });
  }
}
```

`apps/backend/src/modules/users/users.controller.ts`

```ts
import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Post()
  async create(@Body() body: any) {
    // body: { orgId, email, passwordHash } — hashing handled upstream
    return this.users.createUser(body.orgId, body.email, body.passwordHash);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.users.findById(id);
  }
}
```

---

# 11) Roles module + RBAC guard & decorator

`apps/backend/src/modules/roles/roles.module.ts`

```ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';

@Module({
  providers: [PrismaService, RolesService],
  controllers: [RolesController],
  exports: [RolesService],
})
export class RolesModule {}
```

`apps/backend/src/modules/roles/roles.service.ts`

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async createRole(orgId: string | null, name: string, level: string, permissions: string[], isSystem = false) {
    return this.prisma.role.create({
      data: {
        organizationId: orgId ?? null,
        name,
        level,
        permissions,
        isSystem,
      },
    });
  }

  async getUserPermissions(userId: string) {
    const userRoles = await this.prisma.userRole.findMany({ where: { userId }, include: { role: true } });
    const set = new Set<string>();
    for (const ur of userRoles) {
      if (ur.role?.permissions) {
        for (const p of ur.role.permissions) set.add(p);
      }
    }
    return Array.from(set);
  }

  async listRoles(orgId?: string) {
    return this.prisma.role.findMany({ where: { organizationId: orgId ?? undefined }});
  }
}
```

`apps/backend/src/modules/roles/roles.controller.ts`

```ts
import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private roles: RolesService) {}

  @Post()
  async create(@Body() body: any) {
    return this.roles.createRole(body.organizationId ?? null, body.name, body.level, body.permissions, body.isSystem ?? false);
  }

  @Get()
  async list(@Query('org') org?: string) {
    return this.roles.listRoles(org);
  }
}
```

`apps/backend/src/common/decorators/permissions.decorator.ts`

```ts
import { SetMetadata } from '@nestjs/common';
export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
```

`apps/backend/src/common/guards/rbac.guard.ts`

```ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesService } from '../../modules/roles/roles.service';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector, private rolesService: RolesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>('permissions', [context.getHandler(), context.getClass()]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return false;

    const perms = await this.rolesService.getUserPermissions(user.id);
    const ok = required.every(r => perms.includes(r));
    if (!ok) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
```

Use it in controllers like:

```ts
import { UseGuards } from '@nestjs/common';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';

@UseGuards(RbacGuard)
@Permissions('agent:manage')
@Post('agents')
createAgent(...) { ... }
```

---

# 12) Simple Jwt Guard for routes + socket integration

`apps/backend/src/common/guards/jwt.guard.ts`

```ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as fs from 'fs';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'] || req.query?.token;
    if (!auth) throw new UnauthorizedException('No token');

    const token = (auth as string).replace(/^Bearer\s+/i, '');
    try {
      const publicKey = fs.readFileSync(process.env.JWT_ACCESS_PUBLIC_KEY_PATH, 'utf8');
      const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as any;
      req.user = { id: payload.sub, org: payload.org, roles: payload.roles, sessionId: payload.sessionId };
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

For websockets you will validate token on connect and set `client.data`.

---

# 13) Prisma migration reminder

Run:

```bash
npx prisma migrate dev --name init_auth_rbac
npx prisma generate
```

---

# 14) Seed script (optional)

`prisma/seed.ts` (example)

```ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seed() {
  const org = await prisma.organization.upsert({ where: { slug: 'demo' }, update: {}, create: { name: 'Demo Org', slug: 'demo' }});
  const adminRole = await prisma.role.upsert({ where: { organizationId_name: { organizationId: org.id, name: 'org_admin' } as any }, update: {}, create: { organizationId: org.id, name: 'org_admin', level: 'ORG_ADMIN', permissions: ['agent:manage', 'workflow:execute'] }});
  const user = await prisma.user.upsert({ where: { email: 'admin@demo.local' }, update: {}, create: { email: 'admin@demo.local', passwordHash: '$2b$12$devhash.devhash.devhash', organizationId: org.id }});
  await prisma.userRole.create({ data: { userId: user.id, roleId: adminRole.id }});
  console.log('seeded demo org');
}
seed().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
```

---

# 15) Security / Operational checklist (quick)

1. Use KMS/Vault for RSA keys, never env-file in prod.
2. Enable Postgres Row-Level Security for tenant-enforced queries.
3. Use refresh-token rotation and session revocation on reuse.
4. Rate-limit auth endpoints per-IP and per-tenant.
5. Encrypt PII at rest and limit logs.
6. Add OpenTelemetry spans and instrument Prisma queries & Redis I/O.

---
