import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Narrative Content Schema - Converted from TypeORM Entity
 * Original: backend-nestjs/src/entities/content.entity.ts
 */

export type NarrativeContentDocument = NarrativeContent & Document;

// Sub-schemas for nested objects
export class Conflict {
  @Prop({ required: true })
  conflict_id: string;

  @Prop({ required: true })
  statement: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  score: number;

  @Prop()
  reasoning?: string;

  @Prop()
  category?: string;
}

export class PrimaryConflict {
  @Prop({ required: true })
  conflict_id: string;

  @Prop({ required: true })
  statement: string;

  @Prop({ required: true })
  score: number;

  @Prop({ required: true })
  reasoning: string;

  @Prop({ required: true })
  why_this_is_primary: string;

  @Prop({ required: true })
  marketing_angle: string;

  @Prop()
  category?: string;
}

export class ContentAnalysis {
  @Prop({ type: PrimaryConflict })
  primary_conflict?: PrimaryConflict;

  @Prop({ type: [Conflict] })
  conflicts_identified?: Conflict[];

  @Prop({ type: [String] })
  themes?: string[];

  @Prop({ type: [String] })
  core_characters?: string[];

  @Prop({ type: Object })
  genre_analysis?: Record<string, any>;

  @Prop({ type: Object })
  marketing_angles?: Record<string, any>;
}

export class StakeholderResponse {
  @Prop({ required: true })
  role: string;

  @Prop({ required: true })
  question: string;

  @Prop({ required: true })
  answer: string;
}

@Schema({ timestamps: true, collection: 'narrative_contents' })
export class NarrativeContent {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  genre: string;

  @Prop()
  runtime?: number;

  @Prop()
  targetAudience?: string;

  @Prop({ type: String })
  summary?: string;

  @Prop({ type: String })
  script?: string;

  @Prop({ type: ContentAnalysis })
  content_analysis?: ContentAnalysis;

  @Prop({ type: [StakeholderResponse] })
  stakeholder_responses?: StakeholderResponse[];

  @Prop({ default: 'draft' })
  status: string;

  @Prop()
  createdBy?: string;

  @Prop()
  updatedBy?: string;

  // Timestamps are automatically added by mongoose with { timestamps: true }
  createdAt?: Date;
  updatedAt?: Date;
}

export const NarrativeContentSchema = SchemaFactory.createForClass(NarrativeContent);

// Indexes for performance
NarrativeContentSchema.index({ title: 1 });
NarrativeContentSchema.index({ genre: 1 });
NarrativeContentSchema.index({ status: 1 });
NarrativeContentSchema.index({ createdAt: -1 });
