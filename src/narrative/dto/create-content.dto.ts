import { IsString, IsOptional, IsNumber, IsObject, IsNotEmpty } from 'class-validator';

/**
 * Create Content DTO
 * Copied from backend-nestjs/src/content/dto/create-content.dto.ts
 */
export class CreateContentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  genre: string;

  @IsNumber()
  @IsOptional()
  runtime?: number;

  @IsString()
  @IsOptional()
  targetAudience?: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsOptional()
  script?: string;

  @IsString()
  @IsOptional()
  themes?: string;

  @IsString()
  @IsOptional()
  tone?: string;

  @IsObject()
  @IsOptional()
  stakeholderResponses?: any;

  @IsObject()
  @IsOptional()
  contentMetadata?: any;

  @IsObject()
  @IsOptional()
  contentAnalysis?: any;
}
