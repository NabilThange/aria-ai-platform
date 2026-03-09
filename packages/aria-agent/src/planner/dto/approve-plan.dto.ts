import { IsString, IsNotEmpty } from 'class-validator';

export class ApprovePlanDto {
  @IsString()
  @IsNotEmpty()
  pathId: string;
}
