import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class MapProductsDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  productIds: string[];
}
