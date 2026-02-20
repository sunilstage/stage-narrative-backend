/**
 * Audience Council Service - Audience evaluation logic
 * Extracted from evaluation-engine.service.ts
 * Uses Mongoose Models instead of TypeORM Repositories
 */

import { Injectable, Logger } from '@nestjs/common';
import { AnthropicService } from './anthropic.service';
import { AUDIENCE_COUNCIL } from '../constants/prompts.config';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ContentInfo {
  title?: string;
  genre?: string;
  runtime?: number;
  targetAudience?: string;
  summary?: string;
  script?: string;
  themes?: string;
  tone?: string;
}

interface PersonaEvaluation {
  score: number;
  reasoning: string;
  recommendation?: string;
  would_click?: string;
  would_watch?: string;
  emotional_hook_present?: boolean;
  character_interest?: string;
  sounds_like?: string;
  stakes_level?: string;
  vibe?: string;
  authenticity?: string;
  the_real_talk?: string;
  quality_signal?: string;
  sophistication_level?: string;
  refined_assessment?: string;
  stress_level?: string;
  comfort_factor?: string;
  would_watch_when_tired?: boolean;
  parent_perspective?: string;
  premise?: string;
  world_building_promise?: string;
  binge_worthiness?: string;
  arjun_thoughts?: string;
  substance_level?: string;
  maturity_level?: string;
  mature_perspective?: string;
  funny_potential?: string;
  laugh_out_loud_potential?: number;
  rohan_reaction?: string;
  [key: string]: any;
}

interface PersonaConfig {
  roleId: string;
  roleName: string;
  systemInstruction: string;
  evaluationPrompt: string;
  profile?: {
    age: number;
    gender: string;
    segment: string;
  };
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class AudienceCouncilService {
  private readonly logger = new Logger(AudienceCouncilService.name);

  constructor(private anthropicService: AnthropicService) {}

  // ============================================================================
  // EVALUATE WITH AUDIENCE COUNCIL
  // ============================================================================

  async evaluateWithAudienceCouncil(
    narrative: string,
    content: ContentInfo,
  ): Promise<Record<string, PersonaEvaluation>> {
    const evaluations: Record<string, PersonaEvaluation> = {};

    for (const persona of AUDIENCE_COUNCIL) {
      const evalPrompt = persona.evaluationPrompt
        .replace('{content_title}', '[Title Hidden - Evaluate Based on Story]')
        .replace('{content_genre}', content.genre || 'Not specified')
        .replace(
          '{content_summary}',
          (content.summary || '').substring(0, 10000),
        )
        .replace('{narrative}', narrative);

      try {
        const response = await this.anthropicService.createMessage({
          messages: [{ role: 'user', content: evalPrompt }],
          max_tokens: 1200,
          temperature: 0.9,
          system: persona.systemInstruction,
        });

        evaluations[persona.roleId] =
          this.anthropicService.parseJSONResponse<PersonaEvaluation>(response);
      } catch (error) {
        this.logger.error(
          `Error evaluating with persona ${persona.roleId}: ${error.message}`,
        );
        // Provide fallback evaluation
        evaluations[persona.roleId] = {
          score: 5,
          reasoning: `Evaluation failed: ${error.message}`,
        };
      }
    }

    return evaluations;
  }

  // ============================================================================
  // EVALUATE SINGLE PERSONA
  // ============================================================================

  async evaluateSinglePersona(
    narrative: string,
    content: ContentInfo,
    personaId: string,
  ): Promise<PersonaEvaluation> {
    const persona = AUDIENCE_COUNCIL.find((p) => p.roleId === personaId);

    if (!persona) {
      throw new Error(`Persona with ID ${personaId} not found`);
    }

    const evalPrompt = persona.evaluationPrompt
      .replace('{content_title}', '[Title Hidden - Evaluate Based on Story]')
      .replace('{content_genre}', content.genre || 'Not specified')
      .replace(
        '{content_summary}',
        (content.summary || '').substring(0, 10000),
      )
      .replace('{narrative}', narrative);

    const response = await this.anthropicService.createMessage({
      messages: [{ role: 'user', content: evalPrompt }],
      max_tokens: 1200,
      temperature: 0.9,
      system: persona.systemInstruction,
    });

    return this.anthropicService.parseJSONResponse<PersonaEvaluation>(response);
  }

  // ============================================================================
  // GET AUDIENCE PERSONAS
  // ============================================================================

  getAudiencePersonas(): PersonaConfig[] {
    return AUDIENCE_COUNCIL;
  }

  // ============================================================================
  // GET PERSONA BY ID
  // ============================================================================

  getPersonaById(personaId: string): PersonaConfig | undefined {
    return AUDIENCE_COUNCIL.find((p) => p.roleId === personaId);
  }

  // ============================================================================
  // BATCH EVALUATE NARRATIVES
  // ============================================================================

  async batchEvaluateNarratives(
    narratives: string[],
    content: ContentInfo,
  ): Promise<Array<Record<string, PersonaEvaluation>>> {
    const results: Array<Record<string, PersonaEvaluation>> = [];

    for (const narrative of narratives) {
      this.logger.log(`Evaluating narrative: ${narrative.substring(0, 50)}...`);
      const evaluation = await this.evaluateWithAudienceCouncil(
        narrative,
        content,
      );
      results.push(evaluation);
    }

    return results;
  }

  // ============================================================================
  // GET AVERAGE SCORES BY DEMOGRAPHIC
  // ============================================================================

  getAverageScoresByDemographic(
    evaluations: Record<string, PersonaEvaluation>,
  ): {
    by_age: Record<string, number>;
    by_gender: Record<string, number>;
    by_segment: Record<string, number>;
  } {
    const tempAge: Record<string, number[]> = {};
    const tempGender: Record<string, number[]> = {};
    const tempSegment: Record<string, number[]> = {};

    for (const [personaId, evalData] of Object.entries(evaluations)) {
      const score = evalData.score || 0;
      const persona = AUDIENCE_COUNCIL.find((p) => p.roleId === personaId);

      if (!persona?.profile) continue;

      const { age, gender, segment } = persona.profile;

      // Age groups
      let ageGroup: string;
      if (age < 25) ageGroup = '18-24';
      else if (age < 35) ageGroup = '25-34';
      else if (age < 45) ageGroup = '35-44';
      else if (age < 55) ageGroup = '45-54';
      else ageGroup = '55+';

      if (!tempAge[ageGroup]) tempAge[ageGroup] = [];
      tempAge[ageGroup].push(score);

      // Gender
      if (!tempGender[gender]) tempGender[gender] = [];
      tempGender[gender].push(score);

      // Segment
      if (!tempSegment[segment]) tempSegment[segment] = [];
      tempSegment[segment].push(score);
    }

    // Calculate averages
    const by_age: Record<string, number> = {};
    const by_gender: Record<string, number> = {};
    const by_segment: Record<string, number> = {};

    for (const [ageGroup, scores] of Object.entries(tempAge)) {
      by_age[ageGroup] =
        scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    for (const [gender, scores] of Object.entries(tempGender)) {
      by_gender[gender] =
        scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    for (const [segment, scores] of Object.entries(tempSegment)) {
      by_segment[segment] =
        scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    return { by_age, by_gender, by_segment };
  }

  // ============================================================================
  // GET TOP AND BOTTOM PERFORMERS
  // ============================================================================

  getTopAndBottomPerformers(evaluations: Record<string, PersonaEvaluation>): {
    top: Array<{ persona: string; score: number }>;
    bottom: Array<{ persona: string; score: number }>;
  } {
    const sorted = Object.entries(evaluations)
      .map(([personaId, evalData]) => {
        const persona = AUDIENCE_COUNCIL.find((p) => p.roleId === personaId);
        return {
          persona: persona?.roleName || personaId,
          score: evalData.score || 0,
        };
      })
      .sort((a, b) => b.score - a.score);

    return {
      top: sorted.slice(0, 3),
      bottom: sorted.slice(-3).reverse(),
    };
  }

  // ============================================================================
  // CHECK FOR POLARIZATION
  // ============================================================================

  checkForPolarization(evaluations: Record<string, PersonaEvaluation>): {
    isPolarized: boolean;
    range: number;
    highScorers: string[];
    lowScorers: string[];
  } {
    const scores = Object.entries(evaluations).map(([personaId, evalData]) => ({
      personaId,
      score: evalData.score || 0,
    }));

    const scoreValues = scores.map((s) => s.score);
    const min = Math.min(...scoreValues);
    const max = Math.max(...scoreValues);
    const range = max - min;

    const highScorers = scores
      .filter((s) => s.score >= 8)
      .map((s) => {
        const persona = AUDIENCE_COUNCIL.find((p) => p.roleId === s.personaId);
        return persona?.roleName || s.personaId;
      });

    const lowScorers = scores
      .filter((s) => s.score <= 5)
      .map((s) => {
        const persona = AUDIENCE_COUNCIL.find((p) => p.roleId === s.personaId);
        return persona?.roleName || s.personaId;
      });

    return {
      isPolarized: range > 4,
      range,
      highScorers,
      lowScorers,
    };
  }

  // ============================================================================
  // GET OVERALL AUDIENCE SCORE
  // ============================================================================

  getOverallAudienceScore(
    evaluations: Record<string, PersonaEvaluation>,
  ): number {
    const scores = Object.values(evaluations).map((e) => e.score || 0);
    return scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;
  }

  // ============================================================================
  // GET ENGAGEMENT METRICS
  // ============================================================================

  getEngagementMetrics(evaluations: Record<string, PersonaEvaluation>): {
    would_click_yes: number;
    would_click_maybe: number;
    would_click_no: number;
    would_watch_yes: number;
    would_watch_maybe: number;
    would_watch_no: number;
  } {
    const metrics = {
      would_click_yes: 0,
      would_click_maybe: 0,
      would_click_no: 0,
      would_watch_yes: 0,
      would_watch_maybe: 0,
      would_watch_no: 0,
    };

    for (const evalData of Object.values(evaluations)) {
      // Count clicks
      if (evalData.would_click === 'yes') metrics.would_click_yes++;
      else if (evalData.would_click === 'maybe') metrics.would_click_maybe++;
      else if (evalData.would_click === 'no') metrics.would_click_no++;

      // Count watches
      if (evalData.would_watch === 'yes' || evalData.would_watch === 'definitely')
        metrics.would_watch_yes++;
      else if (evalData.would_watch === 'maybe') metrics.would_watch_maybe++;
      else if (evalData.would_watch === 'no') metrics.would_watch_no++;
    }

    return metrics;
  }
}
