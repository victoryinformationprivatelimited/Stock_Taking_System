import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { UserRole } from '@prisma/client';
import { LayoutsService } from './layouts.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { MapProductsDto } from './dto/map-products.dto';
import { Roles } from '../common/roles.decorator';

@Controller('layouts')
@Roles(UserRole.MANAGER)
export class LayoutsController {
  constructor(private layoutsService: LayoutsService) {}

  @Get()
  findAll() {
    return this.layoutsService.findAll();
  }

  @Get('zones')
  findAllZones() {
    return this.layoutsService.findAllZones();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.layoutsService.findOne(id);
  }

  @Get(':id/live')
  getLiveStatus(@Param('id') id: string) {
    return this.layoutsService.getLiveStatus(id);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: 'static/layouts',
        filename: (_req, file, callback) => {
          callback(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  create(@Body('name') name: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No image uploaded');
    }
    return this.layoutsService.create(name || file.originalname, `/static/layouts/${file.filename}`);
  }

  @Post(':id/zones')
  createZone(@Param('id') id: string, @Body() dto: CreateZoneDto) {
    return this.layoutsService.createZone(id, dto);
  }

  @Put(':id/zones/:zoneId')
  updateZone(@Param('id') id: string, @Param('zoneId') zoneId: string, @Body() dto: UpdateZoneDto) {
    return this.layoutsService.updateZone(id, zoneId, dto);
  }

  @Delete(':id/zones/:zoneId')
  deleteZone(@Param('id') id: string, @Param('zoneId') zoneId: string) {
    return this.layoutsService.deleteZone(id, zoneId);
  }

  @Put(':id/zones/:zoneId/products')
  setZoneProducts(
    @Param('id') id: string,
    @Param('zoneId') zoneId: string,
    @Body() dto: MapProductsDto,
  ) {
    return this.layoutsService.setZoneProducts(id, zoneId, dto);
  }
}
