import { Injectable, Scope } from '@nestjs/common';

export interface RequestUser {
  userId: string;
  tenantId: string;
  role: 'MANAGER' | 'COUNTER';
}

@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  private user: RequestUser | null = null;

  setUser(user: RequestUser) {
    this.user = user;
  }

  getUser(): RequestUser {
    if (!this.user) {
      throw new Error('TenantContext accessed before user was set');
    }
    return this.user;
  }

  get tenantId(): string {
    return this.getUser().tenantId;
  }

  get userId(): string {
    return this.getUser().userId;
  }

  get role(): RequestUser['role'] {
    return this.getUser().role;
  }
}
