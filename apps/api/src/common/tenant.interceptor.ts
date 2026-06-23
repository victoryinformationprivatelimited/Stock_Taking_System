import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Scope } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from './tenant-context';

@Injectable({ scope: Scope.REQUEST })
export class TenantInterceptor implements NestInterceptor {
  constructor(private tenantContext: TenantContext) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    if (request.user) {
      this.tenantContext.setUser(request.user);
    }
    return next.handle();
  }
}
