import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Narrative Candidate Schema - Converted from TypeORM Entity
 * Original: backend-nestjs/src/entities/narrative-candidate.entity.ts
 */

export type NarrativeCandidateDocument = NarrativeCandidate & Document;

// Evaluation structures
export class CouncilEvaluation {
  @Prop({ required: true })
  score: number;

  @Prop()
  impression?: string;

  @Prop()
  reasoning?: string;

  @Prop()
  strengths?: string;

  @Prop()
  concerns?: string;
}

export class PersonaEvaluation {
  @Prop({ required: true })
  score: number;

  @Prop()
  why?: string;

  @Prop()
  the_real_talk?: string;

  @Prop()
  refined_assessment?: string;

  @Prop()
  parent_perspective?: string;

  @Prop()
  arjun_thoughts?: string;

  @Prop()
  rohan_reaction?: string;

  @Prop()
  mature_perspective?: string;

  @Prop()
  impression?: string;

  @Prop()
  reasoning?: string;
}

export class DemographicBreakdown {
  @Prop({ type: Object })
  age?: Record<string, number>;

  @Prop({ type: Object })
  gender?: Record<string, number>;

  @Prop({ type: Object })
  segment?: Record<string, number>;
}

export class ConflictUsed {
  @Prop()
  statement?: string;

  @Prop()
  type?: string;

  @Prop()
  score?: number;
}

@Schema({ timestamps: true, collection: 'narrative_candidates' })
export class NarrativeCandidate {
  @Prop({ type: Types.ObjectId, ref: 'NarrativeSession', required: true })
  session_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'NarrativeContent', required: true })
  content_id: Types.ObjectId;

  @Prop({ required: true })
  rank: number;

  @Prop({ required: true, type: String })
  narrative_text: string;

  @Prop()
  angle?: string;

  @Prop({ default: 'ai_only' })
  generation_type: string; // 'ai_only' | 'ai_human'

  @Prop({ required: true, type: Number })
  overall_score: number;

  @Prop({ required: true, type: Number })
  production_avg: number;

  @Prop({ required: true, type: Number })
  audience_avg: number;

  @Prop({ type: [String] })
  insights?: string[];

  @Prop({ type: [ConflictUsed] })
  conflicts?: ConflictUsed[];

  @Prop({ type: DemographicBreakdown })
  demographic_breakdown?: DemographicBreakdown;

  // Production Council evaluations (7 personas)
  @Prop({ type: Map, of: CouncilEvaluation })
  production_council: Map<string, CouncilEvaluation>;

  // Audience Council evaluations (8 personas)
  @Prop({ type: Map, of: PersonaEvaluation })
  audience_council: Map<string, PersonaEvaluation>;

  @Prop({ type: Object })
  metadata?: {
    generation_time?: number;
    model_used?: string;
    tokens_used?: number;
  };

  createdAt?: Date;
  updatedAt?: Date;
}

export const NarrativeCandidateSchema = SchemaFactory.createForClass(NarrativeCandidate);

// Indexes
NarrativeCandidateSchema.index({ session_id: 1 });
NarrativeCandidateSchema.index({ content_id: 1 });
NarrativeCandidateSchema.index({ rank: 1 });
NarrativeCandidateSchema.index({ overall_score: -1 });
NarrativeCandidateSchema.index({ generation_type: 1 });
NarrativeCandidateSchema.index({ createdAt: -1 });
