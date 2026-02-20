import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Narrative Session Schema - Converted from TypeORM Entity
 * Original: backend-nestjs/src/entities/narrative-session.entity.ts
 */

export type NarrativeSessionDocument = NarrativeSession & Document;

// Council conversation structure
export class ConversationMessage {
  @Prop({ required: true })
  speaker: string;

  @Prop({ required: true })
  role: string;

  @Prop({ required: true })
  message: string;

  @Prop()
  timestamp?: Date;

  @Prop()
  phase?: string;
}

export class CouncilConversation {
  @Prop({ type: [ConversationMessage] })
  conversation?: ConversationMessage[];

  @Prop({ type: [String] })
  meeting_insights?: string[];

  @Prop({ type: [String] })
  narratives_created?: string[];

  @Prop({ type: Object })
  part1_pure_ai?: {
    conversation: ConversationMessage[];
    meeting_insights: string[];
    narratives_created: string[];
  };

  @Prop({ type: Object })
  part2_ai_human?: {
    conversation: ConversationMessage[];
    meeting_insights: string[];
    narratives_created: string[];
  };
}

@Schema({ timestamps: true, collection: 'narrative_sessions' })
export class NarrativeSession {
  @Prop({ type: Types.ObjectId, ref: 'NarrativeContent', required: true })
  content_id: Types.ObjectId;

  @Prop({ default: 'pending' })
  status: string; // pending, processing, complete, failed

  @Prop({ default: 1 })
  round_number: number;

  @Prop({ type: Types.ObjectId, ref: 'NarrativeSession' })
  parent_session_id?: Types.ObjectId;

  @Prop({ default: 'deliberative' })
  evaluation_mode: string;

  @Prop({ type: CouncilConversation })
  council_conversation?: CouncilConversation;

  @Prop({ type: Object })
  content_analysis?: Record<string, any>;

  @Prop({ type: Object })
  metadata?: Record<string, any>; // Flexible metadata for tracking generation progress and errors

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  // Job queue reference
  @Prop()
  job_id?: string;

  @Prop({ type: Number, default: 0 })
  progress?: number; // 0-100

  createdAt?: Date;
  updatedAt?: Date;
}

export const NarrativeSessionSchema = SchemaFactory.createForClass(NarrativeSession);

// Indexes
NarrativeSessionSchema.index({ content_id: 1 });
NarrativeSessionSchema.index({ status: 1 });
NarrativeSessionSchema.index({ round_number: 1 });
NarrativeSessionSchema.index({ createdAt: -1 });
NarrativeSessionSchema.index({ job_id: 1 });
