import { IsString, IsObject, IsNotEmpty } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @IsString()
  @IsNotEmpty()
  taskDescription: string;

  @IsObject()
  @IsNotEmpty()
  model: {
    provider: string;
    name: string;
    title: string;
  };
}
