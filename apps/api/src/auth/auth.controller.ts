import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { Public } from '../common/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register-tenant')
  registerTenant(@Body() dto: RegisterTenantDto) {
    return this.authService.registerTenant(dto);
  }
}
