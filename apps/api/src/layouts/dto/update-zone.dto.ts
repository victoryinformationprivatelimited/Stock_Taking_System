import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { GeometryDto } from './create-zone.dto';

export class UpdateZoneDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => GeometryDto)
  geometry?: GeometryDto;
}
