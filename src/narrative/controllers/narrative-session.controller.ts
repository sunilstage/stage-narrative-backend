import {
  Controller,
  Get,
  Param,
  NotFoundException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { NarrativeService } from '../services/narrative.service';

@Controller('narrative')
@ApiTags('Narrative Sessions')
export class NarrativeSessionController {
  constructor(
    private readonly narrativeService: NarrativeService,
  ) {}

  @Get('content/:id/sessions/:sessionId')
  @ApiOperation({ summary: 'Get session results with candidates' })
  @ApiParam({ name: 'id', type: String, description: 'Content ID' })
  @ApiParam({ name: 'sessionId', type: String, description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session data with candidates',
    schema: {
      properties: {
        session: { type: 'object' },
        candidates: { type: 'array' },
        status: { type: 'string' },
        progress: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSession(
    @Param('id') contentId: string,
    @Param('sessionId') sessionId: string,
  ) {
    // Get session data (synchronous - no job queue)
    const sessionData = await this.narrativeService.getSession(
      contentId,
      sessionId,
    );

    if (!sessionData) {
      throw new NotFoundException('Session not found');
    }

    return sessionData;
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get full session data with candidates' })
  @ApiParam({ name: 'sessionId', type: String, description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Full session data with candidates',
  })
  async getSessionById(@Param('sessionId') sessionId: string) {
    const session = await this.narrativeService.findSessionById(sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Get candidates for this session
    const candidates = await this.narrativeService.getSessionCandidates(sessionId);

    return {
      ...session.toObject(),
      candidates,
    };
  }

  @Get('sessions/:sessionId/status')
  @ApiOperation({ summary: 'Get session status and progress' })
  @ApiParam({ name: 'sessionId', type: String, description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session status',
    schema: {
      properties: {
        status: { type: 'string', example: 'completed' },
        progress: { type: 'number', example: 100 },
      },
    },
  })
  async getJobStatus(@Param('sessionId') sessionId: string) {
    const session = await this.narrativeService.findSessionById(sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return {
      status: session.status,
      progress: session.progress || 0,
    };
  }

  @Get('sessions/:sessionId/candidates')
  @ApiOperation({ summary: 'Get all candidates for a session' })
  @ApiParam({ name: 'sessionId', type: String })
  @ApiResponse({ status: 200, description: 'List of candidates' })
  async getSessionCandidates(@Param('sessionId') sessionId: string) {
    return this.narrativeService.getSessionCandidates(sessionId);
  }
}
