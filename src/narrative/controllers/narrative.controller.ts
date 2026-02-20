import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { NarrativeService } from '../services/narrative.service';
import { CreateContentDto } from '../dto/create-content.dto';
import { UpdateContentDto } from '../dto/update-content.dto';
import { GenerateNarrativesDto } from '../dto/generate-narratives.dto';

@Controller('narrative')
@ApiTags('Narrative Engine')
export class NarrativeController {
  constructor(private readonly narrativeService: NarrativeService) {}

  @Post('content')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new narrative content' })
  @ApiResponse({ status: 201, description: 'Content created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createContent(@Body() createContentDto: CreateContentDto) {
    return this.narrativeService.create(createContentDto);
  }

  @Get('content')
  @ApiOperation({ summary: 'Get all narrative contents' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'genre', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of all contents' })
  async getAllContents(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('genre') genre?: string,
    @Query('status') status?: string,
  ) {
    // Note: Pagination and filtering not yet implemented in service
    return this.narrativeService.findAll();
  }

  @Get('content/:id')
  @ApiOperation({ summary: 'Get single narrative content' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Content found' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async getContent(@Param('id') id: string) {
    return this.narrativeService.findOneWithSessions(id);
  }

  @Post('content/:id')
  @ApiOperation({ summary: 'Update narrative content' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Content updated successfully' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async updateContent(
    @Param('id') id: string,
    @Body() updateContentDto: UpdateContentDto,
  ) {
    return this.narrativeService.update(id, updateContentDto);
  }

  @Delete('content/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete narrative content' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204, description: 'Content deleted successfully' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async deleteContent(@Param('id') id: string) {
    await this.narrativeService.delete(id);
  }

  @Post('content/:id/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate marketing narratives (synchronous)' })
  @ApiParam({ name: 'id', type: String, description: 'Content ID' })
  @ApiResponse({
    status: 200,
    description: 'Generation completed successfully',
    schema: {
      properties: {
        sessionId: { type: 'string' },
        status: { type: 'string', example: 'completed' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async generateNarratives(
    @Param('id') contentId: string,
    @Body() dto: GenerateNarrativesDto,
  ) {
    // Convert stakeholder responses array to feedback string if provided
    const stakeholderFeedback = dto.stakeholderResponses
      ? JSON.stringify(dto.stakeholderResponses)
      : undefined;

    const session = await this.narrativeService.generateNarratives(
      contentId,
      dto.round || 1,
      stakeholderFeedback,
    );

    return {
      sessionId: (session as any)._id.toString(),
      status: session.status,
      message: 'Narrative generation completed successfully.',
    };
  }

  @Get('content/:id/rounds')
  @ApiOperation({ summary: 'Get all rounds/sessions for content' })
  @ApiParam({ name: 'id', type: String, description: 'Content ID' })
  @ApiResponse({ status: 200, description: 'List of all sessions' })
  async getRounds(@Param('id') contentId: string) {
    return this.narrativeService.getContentSessions(contentId);
  }

  @Post('upload-pdf')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload PDF and extract text' })
  @ApiResponse({ status: 200, description: 'PDF uploaded and text extracted successfully' })
  async uploadPDF(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      // Import pdf-parse dynamically
      const pdfParse = require('pdf-parse');

      // Extract text from PDF
      const pdfData = await pdfParse(file.buffer);

      return {
        success: true,
        filename: file.originalname,
        pages: pdfData.numpages,
        extracted_text: pdfData.text,
        character_count: pdfData.text.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to parse PDF: ${errorMessage}`);
    }
  }

  @Post('content/:id/stakeholder-responses')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save stakeholder interview responses' })
  @ApiResponse({ status: 200, description: 'Responses saved successfully' })
  async saveStakeholderResponses(
    @Param('id') contentId: string,
    @Body() responses: any,
  ) {
    const content = await this.narrativeService.findOne(contentId);

    // Update content with stakeholder responses
    content.stakeholder_responses = responses;
    await content.save();

    return {
      message: 'Stakeholder responses saved successfully',
      content_id: contentId,
      responses: responses,
    };
  }

  @Get('content/:id/stakeholder-responses')
  @ApiOperation({ summary: 'Get stakeholder interview responses' })
  @ApiResponse({ status: 200, description: 'Responses retrieved successfully' })
  async getStakeholderResponses(@Param('id') contentId: string) {
    const content = await this.narrativeService.findOne(contentId);

    return {
      content_id: contentId,
      responses: content.stakeholder_responses || null,
      has_responses: !!content.stakeholder_responses,
    };
  }
}
