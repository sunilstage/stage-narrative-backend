import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';

/**
 * Update Content DTO
 * Copied from backend-nestjs/src/content/dto/update-content.dto.ts
 */
export class UpdateContentDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  genre?: string;

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
