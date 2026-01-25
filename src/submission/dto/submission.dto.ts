import { IsNumber, IsString } from "class-validator";

export class SubmissionDto {
  @IsString()
  title: string;
  
  @IsNumber()
  timestamp: number;
  
  @IsString()
  statusDisplay: string;
  
  @IsString()
  lang: string;
}   