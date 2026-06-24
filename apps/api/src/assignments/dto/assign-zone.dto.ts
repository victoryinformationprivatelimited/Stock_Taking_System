import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AssignZoneDto {
  @IsUUID()
  counterId: string;

  @IsUUID()
  zoneId: string;

  @IsOptional()
  @IsString()
  dueAt?: string;
}
