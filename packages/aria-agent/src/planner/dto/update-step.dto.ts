import { IsString, IsOptional } from 'class-validator';

export class UpdateStepDto {
  @IsString()
  @IsOptional()
  action?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  command?: string;
}
