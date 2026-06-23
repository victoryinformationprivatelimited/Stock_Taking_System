import { IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class GeometryDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  x: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  y: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  width: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  height: number;
}

export class CreateZoneDto {
  @IsString()
  zoneCode: string;

  @IsOptional()
  @IsString()
  label?: string;

  @ValidateNested()
  @Type(() => GeometryDto)
  geometry: GeometryDto;
}
