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
  @ApiOperation({ summary: 'Upload PDF and extract text (placeholder)' })
  @ApiResponse({ status: 200, description: 'PDF uploaded successfully' })
  async uploadPDF(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // For now, return a placeholder response
    // Full PDF text extraction would require pdf-parse or similar library
    return {
      success: true,
      filename: file.originalname,
      size: file.size,
      message: 'PDF uploaded. Text extraction not yet implemented. Please paste script manually.',
      extracted_text: '',
      pages: 0,
      character_count: 0,
    };
  }
}
