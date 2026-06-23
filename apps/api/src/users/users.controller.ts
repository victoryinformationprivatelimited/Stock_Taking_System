import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Roles } from '../common/roles.decorator';

@Controller('users')
@Roles(UserRole.MANAGER)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  findAll(@Query('role') role?: UserRole) {
    return this.usersService.findAll(role);
  }

  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }
}
