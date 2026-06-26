import { ArrayUnique, IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class AssignZoneDto {
  @IsUUID()
  counterId: string;

  @IsUUID()
  zoneId: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  productIds?: string[];

  @IsOptional()
  @IsString()
  dueAt?: string;
}
