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
} from '@nestjs/common';
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
    const options = {
      page: page || 1,
      limit: limit || 20,
      genre,
      status,
    };
    return this.narrativeService.findAll(options);
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
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Generate marketing narratives (async via BullMQ)' })
  @ApiParam({ name: 'id', type: String, description: 'Content ID' })
  @ApiResponse({
    status: 202,
    description: 'Generation job queued successfully',
    schema: {
      properties: {
        sessionId: { type: 'string' },
        jobId: { type: 'string' },
        status: { type: 'string', example: 'processing' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async generateNarratives(
    @Param('id') contentId: string,
    @Body() dto: GenerateNarrativesDto,
  ) {
    const result = await this.narrativeService.generateNarratives(
      contentId,
      dto.round || 1,
      dto.stakeholderResponses,
    );

    return {
      sessionId: result.session._id.toString(),
      jobId: result.job.id,
      status: 'processing',
      message: 'Narrative generation started. Use sessionId to poll for results.',
    };
  }

  @Get('content/:id/rounds')
  @ApiOperation({ summary: 'Get all rounds/sessions for content' })
  @ApiParam({ name: 'id', type: String, description: 'Content ID' })
  @ApiResponse({ status: 200, description: 'List of all sessions' })
  async getRounds(@Param('id') contentId: string) {
    return this.narrativeService.getContentSessions(contentId);
  }
}
