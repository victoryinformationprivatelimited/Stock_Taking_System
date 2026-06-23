import { IsArray, IsOptional, IsString, IsUUID, ArrayMinSize } from 'class-validator';

export class CreateAssignmentDto {
  @IsUUID()
  counterId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  productIds: string[];

  @IsOptional()
  @IsString()
  dueAt?: string;
}
