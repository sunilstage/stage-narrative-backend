import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  NarrativeContent,
  NarrativeContentDocument,
} from '../schemas/narrative-content.schema';
import {
  NarrativeSession,
  NarrativeSessionDocument,
} from '../schemas/narrative-session.schema';
import {
  NarrativeCandidate,
  NarrativeCandidateDocument,
} from '../schemas/narrative-candidate.schema';
import { ProductionCouncilService } from './production-council.service';
import { CreateContentDto } from '../dto/create-content.dto';
import { UpdateContentDto } from '../dto/update-content.dto';

/**
 * Narrative Service - Main Orchestration Service
 * Converted from TypeORM to Mongoose
 * Original: backend-nestjs/src/content/content.service.ts
 */

@Injectable()
export class NarrativeService {
  private readonly logger = new Logger(NarrativeService.name);

  constructor(
    @InjectModel(NarrativeContent.name)
    private contentModel: Model<NarrativeContentDocument>,
    @InjectModel(NarrativeSession.name)
    private sessionModel: Model<NarrativeSessionDocument>,
    @InjectModel(NarrativeCandidate.name)
    private candidateModel: Model<NarrativeCandidateDocument>,
    private productionCouncil: ProductionCouncilService,
  ) {}

  /**
   * Get all content items
   */
  async findAll(): Promise<NarrativeContent[]> {
    return this.contentModel.find().sort({ createdAt: -1 }).exec();
  }

  /**
   * Get single content by ID
   */
  async findOne(id: string): Promise<NarrativeContent> {
    const content = await this.contentModel.findById(id).exec();

    if (!content) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    return content;
  }

  /**
   * Get content with its sessions
   */
  async findOneWithSessions(id: string): Promise<any> {
    const content = await this.contentModel.findById(id).exec();

    if (!content) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    const sessions = await this.sessionModel
      .find({ content_id: new Types.ObjectId(id) })
      .sort({ createdAt: -1 })
      .exec();

    return {
      ...content.toObject(),
      sessions,
    };
  }

  /**
   * Create new content
   */
  async create(createContentDto: CreateContentDto): Promise<NarrativeContent> {
    const content = new this.contentModel({
      title: createContentDto.title,
      genre: createContentDto.genre,
      runtime: createContentDto.runtime,
      targetAudience: createContentDto.targetAudience,
      summary: createContentDto.summary,
      script: createContentDto.script,
      themes: createContentDto.themes,
      tone: createContentDto.tone,
      stakeholder_responses: createContentDto.stakeholderResponses,
      content_metadata: createContentDto.contentMetadata,
      content_analysis: createContentDto.contentAnalysis,
      status: 'draft',
    });

    return content.save();
  }

  /**
   * Update content
   */
  async update(
    id: string,
    updateContentDto: UpdateContentDto,
  ): Promise<NarrativeContent> {
    const content = await this.contentModel
      .findByIdAndUpdate(id, updateContentDto, { new: true })
      .exec();

    if (!content) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    return content;
  }

  /**
   * Delete content
   */
  async delete(id: string): Promise<void> {
    const result = await this.contentModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }
  }

  /**
   * Generate narratives for content
   * This is the main workflow that runs the evaluation engine
   */
  async generateNarratives(
    contentId: string,
    round: number = 1,
    stakeholderFeedback?: string,
  ): Promise<NarrativeSession> {
    this.logger.log(
      `Starting narrative generation for content ${contentId}, round ${round}`,
    );

    // Fetch content
    const content = await this.findOne(contentId);

    // Create session
    const session = new this.sessionModel({
      content_id: new Types.ObjectId(contentId),
      round_number: round,
      status: 'processing',
      progress: 0,
      startedAt: new Date(),
    });
    await session.save();

    try {
      // Update progress: Content analysis
      session.progress = 10;
      await session.save();

      // Prepare content info for evaluation engine
      const contentInfo = {
        title: content.title,
        genre: content.genre,
        runtime: content.runtime,
        target_audience: content.targetAudience,
        summary: content.summary,
        script: content.script,
        themes: content.content_analysis?.themes?.join(', ') || '',
        tone: content.genre, // Use genre as tone approximation
      };

      // Prepare round context if Round 2
      let roundContext: any = undefined;
      if (round === 2 && stakeholderFeedback) {
        // Fetch previous session results
        const previousSession = await this.sessionModel
          .findOne({
            content_id: new Types.ObjectId(contentId),
            round_number: 1,
          })
          .exec();

        if (previousSession) {
          const previousCandidates = await this.candidateModel
            .find({ session_id: previousSession._id })
            .sort({ overall_score: -1 })
            .limit(5)
            .exec();

          if (previousCandidates.length > 0) {
            const topNarratives = previousCandidates.map((c) => ({
              narrative: c.narrative_text,
              angle: c.angle,
              overall_score: c.overall_score || 0,
              production_avg: c.production_avg || 0,
              audience_avg: c.audience_avg || 0,
            }));

            roundContext = {
              top_narratives: topNarratives,
              stakeholder_feedback: stakeholderFeedback,
            };
          }
        }
      }

      // Check if we have stakeholder responses (Round 1 Part 2)
      const stakeholderContext = (content as any).stakeholder_responses
        ? { stakeholder_responses: (content as any).stakeholder_responses }
        : undefined;

      // Update progress: Brainstorming
      session.progress = 30;
      await session.save();

      // Run evaluation engine
      const [evaluations, brainstormResult, contentAnalysis] =
        await this.productionCouncil.evaluateAllCandidatesDeliberative(
          contentInfo,
          10, // Generate 10 candidates
          roundContext,
          stakeholderContext,
          content.content_analysis, // Pass existing analysis if available
        );

      // Update progress: Evaluating
      session.progress = 70;
      await session.save();

      // Store content analysis if not already stored
      if (contentAnalysis && !content.content_analysis) {
        await this.contentModel
          .findByIdAndUpdate(contentId, {
            content_analysis: contentAnalysis,
          })
          .exec();
      }

      // Store council discussion
      session.council_conversation = {
        conversation: brainstormResult.conversation.map((msg: any) => ({
          speaker: msg.speaker,
          role: 'council_member', // Default role for all council members
          message: msg.message,
          phase: msg.phase,
          timestamp: new Date(),
        })),
        narratives_created: brainstormResult.narratives_created.map(
          (n: any) => n.narrative,
        ),
        meeting_insights: brainstormResult.meeting_insights,
      };

      // Update progress: Saving results
      session.progress = 90;
      await session.save();

      // Save candidates
      for (const evaluation of evaluations) {
        const candidate = new this.candidateModel({
          session_id: session._id,
          content_id: new Types.ObjectId(contentId),
          narrative_text: evaluation.narrative,
          angle: evaluation.angle,
          overall_score: evaluation.overall_score,
          production_avg: evaluation.production_avg,
          audience_avg: evaluation.audience_avg,
          production_council: evaluation.production_council,
          audience_council: evaluation.audience_council,
          insights: evaluation.insights,
          conflicts: evaluation.conflicts,
          demographic_breakdown: evaluation.demographic_breakdown,
          generation_type: 'deliberative',
          rank: evaluation.rank || 0,
        });
        await candidate.save();
      }

      // Complete session
      session.status = 'completed';
      session.completedAt = new Date();
      session.progress = 100;
      await session.save();

      this.logger.log(
        `Successfully generated ${evaluations.length} narratives for content ${contentId}`,
      );

      // Return session with candidates
      const finalSession = await this.sessionModel
        .findById(session._id)
        .exec();

      if (!finalSession) {
        throw new NotFoundException('Session not found after creation');
      }

      return finalSession;
    } catch (error) {
      // Handle errors
      this.logger.error(
        `Error generating narratives for content ${contentId}: ${error.message}`,
        error.stack,
      );

      session.status = 'failed';
      session.progress = 0;
      session.metadata = {
        error: error.message,
      };
      await session.save();

      throw new BadRequestException(
        `Failed to generate narratives: ${error.message}`,
      );
    }
  }

  /**
   * Get session with candidates
   */
  async getSession(
    contentId: string,
    sessionId: string,
  ): Promise<NarrativeSession> {
    const session = await this.sessionModel
      .findOne({
        _id: new Types.ObjectId(sessionId),
        content_id: new Types.ObjectId(contentId),
      })
      .exec();

    if (!session) {
      throw new NotFoundException(
        `Session ${sessionId} not found for content ${contentId}`,
      );
    }

    return session;
  }

  /**
   * Get session candidates
   */
  async getSessionCandidates(sessionId: string): Promise<NarrativeCandidate[]> {
    return this.candidateModel
      .find({ session_id: new Types.ObjectId(sessionId) })
      .sort({ rank: 1 })
      .exec();
  }

  /**
   * Get all sessions for content
   */
  async getContentSessions(contentId: string): Promise<NarrativeSession[]> {
    return this.sessionModel
      .find({ content_id: new Types.ObjectId(contentId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find session by ID only
   */
  async findSessionById(sessionId: string): Promise<NarrativeSession | null> {
    return this.sessionModel.findById(new Types.ObjectId(sessionId)).exec();
  }
}
