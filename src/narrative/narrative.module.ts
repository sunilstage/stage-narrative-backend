import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

// Schemas
import {
  NarrativeContent,
  NarrativeContentSchema,
} from './schemas/narrative-content.schema';
import {
  NarrativeSession,
  NarrativeSessionSchema,
} from './schemas/narrative-session.schema';
import {
  NarrativeCandidate,
  NarrativeCandidateSchema,
} from './schemas/narrative-candidate.schema';

// Controllers
import { NarrativeController } from './controllers/narrative.controller';
import { NarrativeSessionController } from './controllers/narrative-session.controller';

// Services
import { NarrativeService } from './services/narrative.service';
import { StoryArchitectService } from './services/story-architect.service';
import { ProductionCouncilService } from './services/production-council.service';
import { AudienceCouncilService } from './services/audience-council.service';
import { AnthropicService } from './services/anthropic.service';

@Module({
  imports: [
    ConfigModule,
    // Register Mongoose schemas
    MongooseModule.forFeature([
      { name: NarrativeContent.name, schema: NarrativeContentSchema },
      { name: NarrativeSession.name, schema: NarrativeSessionSchema },
      { name: NarrativeCandidate.name, schema: NarrativeCandidateSchema },
    ]),
    // BullMQ removed - using synchronous generation for standalone deployment
  ],
  controllers: [NarrativeController, NarrativeSessionController],
  providers: [
    NarrativeService,
    StoryArchitectService,
    ProductionCouncilService,
    AudienceCouncilService,
    AnthropicService,
    // Worker removed - synchronous generation
  ],
  exports: [NarrativeService],
})
export class NarrativeModule {}
