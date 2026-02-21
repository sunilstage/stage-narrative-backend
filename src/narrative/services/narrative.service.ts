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
    this.logger.log(`Finding content: ${id}`);

    const content = await this.contentModel.findById(id).exec();

    if (!content) {
      this.logger.warn(`⚠️ Content not found: ${id}`);
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    this.logger.log(`✅ Content found: ${content.title}`);
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
    this.logger.log(`Creating content: ${createContentDto.title}`);
    this.logger.debug(`Full DTO: ${JSON.stringify(createContentDto)}`);

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

    const saved = await content.save();
    this.logger.log(`✅ Content saved to DB: ${saved._id}`);

    return saved;
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
   * Create a new session for narrative generation
   */
  async createSession(
    contentId: string,
    round: number = 1,
  ): Promise<NarrativeSessionDocument> {
    this.logger.log('💾 Creating session...');
    const session = new this.sessionModel({
      content_id: new Types.ObjectId(contentId),
      round_number: round,
      status: 'processing',
      progress: 0,
      startedAt: new Date(),
    });
    await session.save();
    this.logger.log(`✅ Session created: ${session._id}`);
    return session;
  }

  /**
   * Generate narratives for content
   * This is the main workflow that runs the evaluation engine
   */
  async generateNarratives(
    contentId: string,
    round: number = 1,
    stakeholderFeedback?: string,
    existingSession?: NarrativeSessionDocument,
  ): Promise<NarrativeSessionDocument> {
    this.logger.log(`🎬 Starting generation: contentId=${contentId}, round=${round}`);

    // Fetch content
    this.logger.log('📖 Fetching content...');
    const content = await this.findOne(contentId);
    this.logger.log(`✅ Content retrieved: ${content.title}`);

    // Check for stakeholder responses
    if ((content as any).stakeholder_responses) {
      this.logger.log(`📋 Stakeholder responses found: ${(content as any).stakeholder_responses.length} entries`);
    } else {
      this.logger.warn('⚠️ No stakeholder responses found');
    }

    // Use existing session or create new one
    const session = existingSession || await this.createSession(contentId, round);

    try {
      // Update progress: Content analysis
      this.logger.log('📊 Analyzing content...');
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

      // Check if we have stakeholder responses for Part 2
      const hasStakeholderInput = !!(content as any).stakeholder_responses;
      const stakeholderContext = hasStakeholderInput
        ? { stakeholder_responses: (content as any).stakeholder_responses }
        : undefined;

      // ==================================================================
      // PART 1: AI-ONLY NARRATIVES (Pure Council Brainstorm)
      // ==================================================================
      console.log('🤖 [GENERATION] PART 1: AI-Only Narratives (5)');
      this.logger.log('🤖 PART 1: AI-Only Narratives');
      session.progress = 30;
      session.metadata = {
        ...session.metadata,
        last_step: 'part1_ai_only_start',
        last_update: new Date().toISOString(),
      };
      await session.save();

      let part1Evaluations: any[];
      let part1Brainstorm: any;
      let contentAnalysis: any;

      try {
        [part1Evaluations, part1Brainstorm, contentAnalysis] =
          await this.productionCouncil.evaluateAllCandidatesDeliberative(
            contentInfo,
            5, // Part 1: 5 AI-only narratives
            roundContext,
            undefined, // NO stakeholder context in Part 1
            content.content_analysis,
          );

        console.log(`✅ [GENERATION] Part 1 complete: ${part1Evaluations.length} AI-only narratives`);
        session.progress = 50;
        session.metadata = {
          ...session.metadata,
          last_step: 'part1_complete',
          part1_count: part1Evaluations.length,
          last_update: new Date().toISOString(),
        };
        await session.save();
      } catch (error) {
        console.error('❌ [GENERATION] Part 1 failed:', error);
        session.metadata = {
          ...session.metadata,
          last_step: 'part1_error',
          error_message: error.message,
          last_update: new Date().toISOString(),
        };
        await session.save();
        throw error;
      }

      // ==================================================================
      // PART 2: AI+HUMAN NARRATIVES (With Stakeholder Input)
      // ==================================================================
      console.log('🤝 [GENERATION] PART 2: AI+Human Narratives (5)');
      this.logger.log('🤝 PART 2: AI+Human Narratives');
      session.progress = 60;
      session.metadata = {
        ...session.metadata,
        last_step: 'part2_ai_human_start',
        last_update: new Date().toISOString(),
      };
      await session.save();

      let part2Evaluations: any[];
      let part2Brainstorm: any;

      try {
        [part2Evaluations, part2Brainstorm] =
          await this.productionCouncil.evaluateAllCandidatesDeliberative(
            contentInfo,
            5, // Part 2: 5 AI+Human narratives
            roundContext,
            stakeholderContext, // WITH stakeholder context in Part 2
            contentAnalysis, // Use analysis from Part 1
          );

        console.log(`✅ [GENERATION] Part 2 complete: ${part2Evaluations.length} AI+Human narratives`);
        session.progress = 70;
        session.metadata = {
          ...session.metadata,
          last_step: 'part2_complete',
          part2_count: part2Evaluations.length,
          last_update: new Date().toISOString(),
        };
        await session.save();
      } catch (error) {
        console.error('❌ [GENERATION] Part 2 failed:', error);
        session.metadata = {
          ...session.metadata,
          last_step: 'part2_error',
          error_message: error.message,
          last_update: new Date().toISOString(),
        };
        await session.save();
        throw error;
      }

      // Combine both parts
      const evaluations = part1Evaluations.concat(part2Evaluations);
      const brainstormResult = {
        conversation: [...part1Brainstorm.conversation, ...part2Brainstorm.conversation],
        narratives_created: [...part1Brainstorm.narratives_created, ...part2Brainstorm.narratives_created],
        meeting_insights: [...(part1Brainstorm.meeting_insights || []), ...(part2Brainstorm.meeting_insights || [])],
        part1_pure_ai: part1Brainstorm,
        part2_ai_human: part2Brainstorm,
      };

      console.log(`✅ [GENERATION] Total narratives: ${evaluations.length} (${part1Evaluations.length} AI-only + ${part2Evaluations.length} AI+Human)`);
      this.logger.log(`✅ Total: ${evaluations.length} narratives generated`)

      // Update progress: Evaluating
      this.logger.log('💾 Saving session data...');
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

      // Save candidates with correct generation_type
      const part1Count = part1Evaluations.length;
      for (let i = 0; i < evaluations.length; i++) {
        const evaluation = evaluations[i];
        const isAiOnly = i < part1Count;

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
          generation_type: isAiOnly ? 'ai_only' : 'ai_human', // Set correct type based on part
          rank: evaluation.rank || 0,
        });
        await candidate.save();

        console.log(`💾 Saved narrative ${i + 1}/${evaluations.length} (${candidate.generation_type}): "${evaluation.narrative.substring(0, 50)}..."`);
      }

      // Complete session
      session.status = 'completed';
      session.completedAt = new Date();
      session.progress = 100;
      await session.save();

      this.logger.log(`✅ Generation completed successfully: ${session._id}`);

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
