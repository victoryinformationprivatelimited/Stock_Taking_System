import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LogSeverity, LogSource } from '@prisma/client';

export class CreateErrorLogDto {
  @IsEnum(LogSource)
  source: LogSource;

  @IsEnum(LogSeverity)
  severity: LogSeverity;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  stack?: string;

  @IsOptional()
  context?: unknown;
}
