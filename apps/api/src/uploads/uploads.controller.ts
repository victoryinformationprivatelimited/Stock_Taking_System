import {
  BadRequestException,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { UploadsService } from './uploads.service';
import { Roles } from '../common/roles.decorator';

@Controller('uploads')
@Roles(UserRole.MANAGER)
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Get()
  list() {
    return this.uploadsService.listUploads();
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.uploadsService.processUpload(file);
  }
}
