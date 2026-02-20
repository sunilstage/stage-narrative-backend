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
  Logger,
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
  private readonly logger = new Logger(NarrativeController.name);

  constructor(private readonly narrativeService: NarrativeService) {}

  @Post('content')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new narrative content' })
  @ApiResponse({ status: 201, description: 'Content created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createContent(@Body() createContentDto: CreateContentDto) {
    this.logger.log(`📝 Creating content: ${createContentDto.title}`);
    this.logger.debug(`Content data: ${JSON.stringify(createContentDto)}`);

    const result = await this.narrativeService.create(createContentDto);

    this.logger.log(`✅ Content created: ID=${(result as any)._id}`);
    return result;
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
    this.logger.log(`🔍 Fetching content: ID=${id}`);

    const result = await this.narrativeService.findOneWithSessions(id);

    this.logger.log(`✅ Content retrieved: ID=${id}`);
    return result;
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
    this.logger.log(`🗑️ Deleting content: ID=${id}`);

    await this.narrativeService.delete(id);

    this.logger.log(`✅ Content deleted: ID=${id}`);
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
    this.logger.log(`🎬 Generation request: contentId=${contentId}, round=${dto.round || 1}`);
    this.logger.debug(`Request body: ${JSON.stringify(dto)}`);

    try {
      // Convert stakeholder responses array to feedback string if provided
      const stakeholderFeedback = dto.stakeholderResponses
        ? JSON.stringify(dto.stakeholderResponses)
        : undefined;

      this.logger.log(`📊 Stakeholder responses: ${stakeholderFeedback ? 'Provided' : 'None'}`);

      // Step 1: Create session immediately
      const session = await this.narrativeService.createSession(
        contentId,
        dto.round || 1,
      );

      const sessionId = (session as any)._id.toString();
      this.logger.log(`✅ Session created: ${sessionId}`);

      // Step 2: Start generation in background (fire and forget)
      this.narrativeService.generateNarratives(
        contentId,
        dto.round || 1,
        stakeholderFeedback,
        session, // Pass the existing session
      ).then(() => {
        this.logger.log(`✅ Generation completed: sessionId=${sessionId}`);
      }).catch(error => {
        this.logger.error(`❌ Background generation failed: ${error.message}`, error.stack);
      });

      // Step 3: Return immediately with session ID
      return {
        session_id: sessionId,
        status: 'processing',
        candidates_generated: 10,
        message: 'Narrative generation started successfully.',
      };
    } catch (error) {
      this.logger.error(`❌ Generation start failed: ${error.message}`, error.stack);
      throw error;
    }
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
      this.logger.warn('⚠️ PDF upload attempted with no file');
      throw new BadRequestException('No file uploaded');
    }

    this.logger.log(`📄 Processing PDF: ${file.originalname} (${file.size} bytes)`);

    try {
      // Import pdf-parse dynamically
      const pdfParse = require('pdf-parse');

      // Extract text from PDF
      const pdfData = await pdfParse(file.buffer);

      this.logger.log(`✅ PDF processed: ${pdfData.numpages} pages, ${pdfData.text.length} characters`);

      return {
        success: true,
        filename: file.originalname,
        pages: pdfData.numpages,
        extracted_text: pdfData.text,
        character_count: pdfData.text.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ PDF parsing failed: ${errorMessage}`, error.stack);
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
    this.logger.log(`💾 Saving stakeholder responses: contentId=${contentId}`);
    this.logger.debug(`Responses data: ${JSON.stringify(responses)}`);

    try {
      // Update content with stakeholder responses
      await this.narrativeService.update(contentId, {
        stakeholder_responses: responses,
      } as any);

      this.logger.log(`✅ Stakeholder responses saved: contentId=${contentId}`);

      return {
        message: 'Stakeholder responses saved successfully',
        content_id: contentId,
        responses: responses,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to save stakeholder responses: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('content/:id/stakeholder-responses')
  @ApiOperation({ summary: 'Get stakeholder interview responses' })
  @ApiResponse({ status: 200, description: 'Responses retrieved successfully' })
  async getStakeholderResponses(@Param('id') contentId: string) {
    const content = await this.narrativeService.findOne(contentId);

    const responses = content.stakeholder_responses || null;
    const hasResponses = !!(
      responses &&
      Array.isArray(responses) &&
      responses.length > 0
    );

    return {
      content_id: contentId,
      responses: responses,
      has_responses: hasResponses,
    };
  }
}
