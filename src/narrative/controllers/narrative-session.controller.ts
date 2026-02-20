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
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('narrative')
@ApiTags('Narrative Sessions')
export class NarrativeSessionController {
  constructor(
    private readonly narrativeService: NarrativeService,
    @InjectQueue('narrative-generation') private narrativeQueue: Queue,
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
    // Get session data
    const sessionData = await this.narrativeService.getSession(
      contentId,
      sessionId,
    );

    if (!sessionData) {
      throw new NotFoundException('Session not found');
    }

    // Get job status from BullMQ
    let jobStatus = null;
    let jobProgress = 0;

    if (sessionData.session.job_id) {
      try {
        const job = await this.narrativeQueue.getJob(sessionData.session.job_id);
        if (job) {
          jobStatus = await job.getState();
          jobProgress = job.progress as number || 0;
        }
      } catch (error) {
        // Job might be cleaned up already
        console.warn('Could not fetch job status:', error.message);
      }
    }

    return {
      session: sessionData.session,
      candidates: sessionData.candidates,
      status: jobStatus || sessionData.session.status,
      progress: jobProgress || sessionData.session.progress || 0,
    };
  }

  @Get('sessions/:sessionId/status')
  @ApiOperation({ summary: 'Get job status and progress' })
  @ApiParam({ name: 'sessionId', type: String, description: 'Session ID (also job ID)' })
  @ApiResponse({
    status: 200,
    description: 'Job status',
    schema: {
      properties: {
        status: { type: 'string', example: 'completed' },
        progress: { type: 'number', example: 100 },
        result: { type: 'object' },
      },
    },
  })
  async getJobStatus(@Param('sessionId') sessionId: string) {
    try {
      const job = await this.narrativeQueue.getJob(sessionId);

      if (!job) {
        throw new NotFoundException('Job not found');
      }

      const state = await job.getState();
      const progress = (job.progress as number) || 0;

      return {
        status: state,
        progress,
        result: state === 'completed' ? await job.returnvalue : null,
        failedReason: state === 'failed' ? job.failedReason : null,
      };
    } catch (error) {
      throw new NotFoundException('Job not found or expired');
    }
  }

  @Get('sessions/:sessionId/candidates')
  @ApiOperation({ summary: 'Get all candidates for a session' })
  @ApiParam({ name: 'sessionId', type: String })
  @ApiResponse({ status: 200, description: 'List of candidates' })
  async getSessionCandidates(@Param('sessionId') sessionId: string) {
    return this.narrativeService.getSessionCandidates(sessionId);
  }
}
