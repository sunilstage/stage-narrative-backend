import { IsOptional, IsNumber, IsArray, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateNarrativesDto {
  @ApiPropertyOptional({
    description: 'Round number (1 = AI only, 2 = AI + Human feedback)',
    example: 1,
    minimum: 1,
    maximum: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(2)
  round?: number = 1;

  @ApiPropertyOptional({
    description: 'Stakeholder responses for Round 2 generation',
    example: [
      {
        role: 'content_head',
        question: 'What is the core emotional journey?',
        answer: 'Redemption through sacrifice',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  stakeholderResponses?: Array<{
    role: string;
    question: string;
    answer: string;
  }>;
}
