import { Controller, Get, Param, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ProductsService } from './products.service';
import { Roles } from '../common/roles.decorator';

@Controller('products')
@Roles(UserRole.MANAGER)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.productsService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }
}
