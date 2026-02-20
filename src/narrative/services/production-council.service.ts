/**
 * Production Council Service - Council brainstorming logic
 * Converted from evaluation-engine.service.ts
 * Uses Mongoose Models instead of TypeORM Repositories
 */

import { Injectable, Logger } from '@nestjs/common';
import { AnthropicService } from './anthropic.service';
import { StoryArchitectService } from './story-architect.service';
import { AudienceCouncilService } from './audience-council.service';
import {
  PRODUCTION_COUNCIL,
  AUDIENCE_COUNCIL,
} from '../constants/prompts.config';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ContentInfo {
  title?: string;
  genre?: string;
  runtime?: number;
  target_audience?: string;
  summary?: string;
  script?: string;
  themes?: string;
  tone?: string;
}

interface NarrativeCandidate {
  narrative: string;
  angle: string;
  reasoning: string;
  builds_on?: string;
}

interface PersonaEvaluation {
  score: number;
  reasoning: string;
  recommendation?: string;
  would_click?: string;
  would_watch?: string;
  [key: string]: any;
}

interface EvaluationResult {
  narrative: string;
  angle?: string;
  reasoning?: string;
  overall_score: number;
  production_avg: number;
  audience_avg: number;
  production_council?: Record<string, PersonaEvaluation>;
  audience_council: Record<string, PersonaEvaluation>;
  conflicts?: ConflictInfo[];
  demographic_breakdown?: DemographicAnalysis;
  insights?: string[];
  rank?: number;
  creation_process?: string;
}

interface ScoreStats {
  average: number;
  min: number;
  max: number;
  count: number;
}

interface ConflictInfo {
  type: string;
  severity: string;
  description: string;
  role?: string;
}

interface DemographicAnalysis {
  by_age: Record<string, number>;
  by_gender: Record<string, number>;
  by_segment: Record<string, number>;
  strong_appeal: Array<{ persona: string; score: number }>;
  weak_appeal: Array<{ persona: string; score: number }>;
}

interface ContentAnalysis {
  characters?: any[];
  conflicts_identified?: any[];
  conflict_relationships?: string;
  thematic_core?: {
    central_question: string;
    emotional_core: string;
    themes: string[];
  };
  primary_conflict?: {
    conflict_id: string;
    statement: string;
    why_this_is_primary: string;
    marketing_angle: string;
  };
  secondary_conflicts?: Array<{
    conflict_id: string;
    statement: string;
    relationship_to_primary: string;
  }>;
  marketing_strategy?: any;
  edge_case_handling?: any;
  logline?: string;
  genre_positioning?: string;
  usps?: string[];
  main_conflict?: string;
  thematic_question?: string;
}

interface BrainstormResult {
  conversation: Array<{
    speaker: string;
    message: string;
    phase: string;
  }>;
  narratives_created: Array<{
    narrative: string;
    angle: string;
    created_by: string;
    key_discussion: string;
    consensus: string;
  }>;
  meeting_insights: string[];
}

interface Round2Context {
  top_narratives?: EvaluationResult[];
  stakeholder_feedback?: string;
  stakeholder_responses?: any;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class ProductionCouncilService {
  private readonly logger = new Logger(ProductionCouncilService.name);

  constructor(
    private anthropicService: AnthropicService,
    private storyArchitectService: StoryArchitectService,
    private audienceCouncilService: AudienceCouncilService,
  ) {}

  // ============================================================================
  // BRAINSTORM NARRATIVES WITH COUNCIL
  // ============================================================================

  async brainstormNarrativesWithCouncil(
    content: ContentInfo,
    count: number = 10,
    roundContext?: Round2Context,
    contentAnalysis?: ContentAnalysis,
  ): Promise<BrainstormResult> {
    // Build context section
    let contextSection = '';

    // Check for stakeholder responses (Round 1 Part 2)
    if (roundContext?.stakeholder_responses) {
      const stakeholderData = roundContext.stakeholder_responses;
      contextSection = `
═══════════════════════════════════════════════════════════════
📋 STAKEHOLDER STRATEGIC INPUTS
═══════════════════════════════════════════════════════════════

The STAGE marketing team has provided strategic inputs to guide narrative creation.
Review these carefully and integrate them into your discussion and narrative creation.

STAKEHOLDER RESPONSES:
${JSON.stringify(stakeholderData, null, 2)}

🎯 YOUR MISSION:
Integrate these stakeholder insights while brainstorming:
1. Consider their business objectives and success metrics
2. Align with their brand positioning and differentiation strategy
3. Respect their target audience insights and cultural context
4. Match their desired emotional core and tonal direction
5. Address their competitive positioning and messaging constraints

Show in your discussion how you're incorporating these strategic inputs.
═══════════════════════════════════════════════════════════════
`;
    } else if (roundContext?.top_narratives) {
      // Round 2 with Round 1 results
      const round1Text = roundContext.top_narratives
        .slice(0, 5)
        .map(
          (n, i) =>
            `  ${i + 1}. "${n.narrative}" (Angle: ${n.angle}, Score: ${n.overall_score.toFixed(1)}/10)`,
        )
        .join('\n');

      contextSection = `
═══════════════════════════════════════════════════════════════
🔄 THIS IS ROUND 2 - CONTINUING FROM ROUND 1
═══════════════════════════════════════════════════════════════

ROUND 1 RESULTS (Top 5 Narratives):
${round1Text}

📣 STAKEHOLDER FEEDBACK:
"${roundContext.stakeholder_feedback}"

🎯 ROUND 2 MISSION:
The STAGE team has reviewed your Round 1 narratives and provided important feedback above.
Your job now is to:
1. Review what worked in Round 1 and what could be better
2. Consider the stakeholder's feedback - what context or angle did you miss?
3. Create ${count} NEW narrative candidates that:
   - Address the stakeholder's feedback
   - Explore any missed angles or contexts
   - Refine/improve promising Round 1 candidates if appropriate
   - Create fresh alternatives based on the new direction

Show how the discussion incorporates Round 1 learnings and stakeholder insights.
═══════════════════════════════════════════════════════════════
`;
    }

    // Build Primary Conflict Section
    let conflictSection = '';
    if (contentAnalysis?.primary_conflict) {
      const primary = contentAnalysis.primary_conflict;
      const secondary = contentAnalysis.secondary_conflicts || [];
      const thematic = (contentAnalysis as any).thematic_core || {};

      conflictSection = `
═══════════════════════════════════════════════════════════════
🎯 PRIMARY CONFLICT (STORY ARCHITECT ANALYSIS)
═══════════════════════════════════════════════════════════════

PRIMARY DRAMATIC CONFLICT:
"${primary.statement || 'Not extracted'}"

WHY THIS IS PRIMARY:
${primary.why_this_is_primary || 'Highest marketing viability'}

MARKETING ANGLE:
${primary.marketing_angle || 'Focus on stakes and tension'}

THEMATIC CORE:
${(thematic as any).central_question || 'Not specified'}

SECONDARY CONFLICTS (for context):
${secondary
  .slice(0, 3)
  .map((s) => `  • ${s.statement || ''}`)
  .join('\n')}

🚨 CRITICAL INSTRUCTION FOR ALL COUNCIL MEMBERS:
Every narrative you create MUST center on this primary conflict.
Do NOT focus on minor themes, peripheral characters, or stylistic elements.
The primary conflict is your marketing anchor - make it crystal clear.

Story Architect will participate to ensure conflict-centricity.
═══════════════════════════════════════════════════════════════
`;
    }

    const prompt = `
You are facilitating a CREATIVE BRAINSTORMING meeting for STAGE OTT platform's Production Council.

🎯 CRITICAL: The team is creating narratives for HINDI-FIRST audiences. All narratives must be in HINDI/HINGLISH with Hindi cultural context.

${conflictSection}

${contextSection}

CONTENT TO CREATE NARRATIVES FOR:
[NOTE: Title is intentionally hidden - focus purely on story content, not any preconceived titles]

Genre: ${content.genre || 'Not specified'}
Runtime: ${content.runtime || 'Not specified'} minutes
Target Audience: ${content.target_audience || 'General'} (HINDI-SPEAKING)
Themes: ${content.themes || 'Not specified'}
Tone: ${content.tone || 'Not specified'}

Story Content:
${content.summary || 'Not provided'}

COUNCIL MEMBERS BRAINSTORMING:
1. Content Head - Business strategy, what sells to Hindi audiences
2. Content Manager - Story accuracy, Hindi audience expectations
3. Story Architect - PRIMARY CONFLICT GUARDIAN, keeps team focused on main dramatic tension
4. Marketing Manager - Differentiation, market positioning in Hindi context
5. Promo Producer - Acquisition focus, conversion messaging
6. Poster Designer - Visual translatability of conflict
7. Trailer Designer - Trailer execution of dramatic tension

MEETING OBJECTIVE:
${roundContext ? 'Continue the Round 2 discussion addressing stakeholder feedback and create' : 'Create'} ${count} powerful HINDI/HINGLISH marketing narrative candidates through collaborative discussion.

🎯 CRITICAL: CREATE VARIETY - AVOID SIMILAR NARRATIVES
Even though all narratives MUST center on the primary conflict, make each one DIFFERENT:
- Use different ANGLES: emotional vs plot-driven, character-focused vs stakes-focused, mystery vs action
- Vary TONE: intense/dark vs playful/ironic, poetic vs direct, suspenseful vs revelatory
- Try different HOOKS: question-based, statement-based, contrast-based, curiosity-gap
- Mix STYLES: single powerful line vs two complementary lines, metaphor-rich vs concrete
- Emphasize different ASPECTS of the same conflict: the WHO, the WHAT, the WHY, the STAKES, the TWIST
- Use SECONDARY conflicts as supporting context (but primary must dominate)

HINDI-FIRST REQUIREMENTS:
- Team discusses primarily in English (for clarity) BUT creates narratives in HINDI/HINGLISH
- Team emphasizes Hindi idioms, cultural references, and wordplay
- Think like Bollywood/OTT marketing to Hindi audiences
- Use conversational Hinglish where natural
- Focus on what resonates with Indian/Hindi-speaking viewers

REALISTIC MEETING FLOW:

PHASE 1: Understanding (5-8 messages)
- Members share what strikes them about the content
- Discuss core themes, unique elements
- Identify potential angles

PHASE 2: Ideation (10-15 messages)
- Members propose narrative ideas with DIFFERENT ANGLES
- Story Architect ensures each focuses on PRIMARY CONFLICT but from unique perspective
- Actively avoid repetition: "That's too similar to narrative #2, let's try a different tone"
- Explore: emotional hook, plot mystery, character focus, stakes emphasis, twist tease
- Others react, build on, critique, improve
- "What if we emphasize..."
- "I love that angle, but what if we also..."
- "Marketing raises a good point, maybe we could..."
- Healthy debate and creative friction
- VARIETY CHECK: Each narrative must feel distinctly different

PHASE 3: Refinement (8-12 messages)
- Polish the strongest ideas
- Combine elements from different suggestions
- Test different phrasings
- Push each other to be more specific, more provocative

PHASE 4: Finalization (5-8 messages)
- Lock in the ${count} narrative candidates
- Quick vote of confidence on each
- Final tweaks

REQUIREMENTS:
- Show REAL creative collaboration with disagreements, building on ideas
- Members reference each other: "I agree with Creative that...", "Marketing's point about differentiation is valid, but..."
- Some members advocate for bold approaches, others push back
- Show evolution of ideas through discussion
- Natural, professional conversation flow
- Rich detail in the discussion (30-50 messages total)

Return as JSON:
{
  "conversation": [
    {
      "speaker": "Content Head",
      "message": "Alright team, let's dig into this content. What's jumping out at everyone?",
      "phase": "understanding"
    },
    {
      "speaker": "Creative Director",
      "message": "The irony is strong here - a village that renamed itself for peace...",
      "phase": "understanding"
    }
  ],
  "narratives_created": [
    {
      "narrative": "Final polished narrative text IN HINDI/HINGLISH",
      "angle": "emotional/plot/mystery/stakes/character",
      "created_by": "Collaborative - led by Marketing Manager",
      "key_discussion": "Brief summary of how this narrative evolved, including Hindi wordplay decisions",
      "consensus": "high/medium/split"
    }
  ],
  "meeting_insights": [
    "What the team learned about the content",
    "Key creative decisions made",
    "Areas of agreement/disagreement"
  ]
}
`;

    const response = await this.anthropicService.createMessage({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 16000,
      temperature: 0.9,
    });

    return this.anthropicService.parseJSONResponse<BrainstormResult>(response);
  }

  // ============================================================================
  // EVALUATE ALL CANDIDATES DELIBERATIVE (Main Orchestrator)
  // ============================================================================

  async evaluateAllCandidatesDeliberative(
    content: ContentInfo,
    count: number = 10,
    roundContext?: Round2Context,
    stakeholderContext?: any,
    contentAnalysis?: ContentAnalysis,
  ): Promise<
    [EvaluationResult[], BrainstormResult, ContentAnalysis | undefined]
  > {
    const contextToUse = stakeholderContext || roundContext;

    if (contextToUse) {
      if (contextToUse.stakeholder_responses) {
        this.logger.log(
          '🗣️  Council Brainstorming with Stakeholder Input + Story Architect',
        );
      } else {
        this.logger.log(
          '🗣️  ROUND 2: Council Brainstorming with Stakeholder Feedback + Story Architect',
        );
      }
    } else {
      this.logger.log(
        '🗣️  ROUND 1: Council Brainstorming Process with Story Architect',
      );
    }
    this.logger.log('='.repeat(60));

    // Step 0: Deep Content Analysis
    let analysis = contentAnalysis;
    if (!analysis) {
      this.logger.log('\n🎭 STEP 0: Story Architect Deep Analysis');
      this.logger.log('  Extracting characters, conflicts, themes...');
      this.logger.log('  Scoring conflicts for marketing viability...');
      this.logger.log('  Identifying PRIMARY CONFLICT...');

      analysis = await this.storyArchitectService.analyzeContent(content);

      const primaryConflict =
        analysis.primary_conflict?.statement || 'Not extracted';
      this.logger.log(
        `  ✓ PRIMARY CONFLICT: "${primaryConflict.substring(0, 100)}..."`,
      );
    } else {
      this.logger.log('\n🎭 Using pre-computed Story Architect analysis');
      const primaryConflict =
        analysis.primary_conflict?.statement || 'Not extracted';
      this.logger.log(
        `  ✓ PRIMARY CONFLICT: "${primaryConflict.substring(0, 100)}..."`,
      );
    }

    // Step 1: Council brainstorming
    this.logger.log('\n💡 STEP 1: Production Council Creative Brainstorming');
    this.logger.log(
      '  🎯 PRIMARY CONFLICT will be injected as non-negotiable constraint',
    );

    if (contextToUse) {
      if (contextToUse.stakeholder_responses) {
        this.logger.log('  Council integrating stakeholder inputs...');
        this.logger.log(
          `  Creating ${count} conflict-driven narratives with strategic context...`,
        );
      } else {
        this.logger.log('  Council reviewing Round 1 + stakeholder feedback...');
        this.logger.log(
          `  Creating ${count} new conflict-driven narratives addressing feedback...`,
        );
      }
    } else {
      this.logger.log(
        `  Council is discussing content and creating ${count} conflict-driven narratives...`,
      );
    }

    const brainstormResult = await this.brainstormNarrativesWithCouncil(
      content,
      count,
      contextToUse,
      analysis,
    );

    this.logger.log(
      `  ✓ Brainstorming complete (${brainstormResult.conversation.length} messages)`,
    );
    this.logger.log(
      `  ✓ Created: ${brainstormResult.narratives_created.length} narrative candidates`,
    );

    // Step 2: Evaluate with audience
    this.logger.log('\n👥 STEP 2: Audience Persona Evaluation');
    this.logger.log(
      `  Testing ${brainstormResult.narratives_created.length} council-created narratives...`,
    );

    const evaluations: EvaluationResult[] = [];

    for (let i = 0; i < brainstormResult.narratives_created.length; i++) {
      const narrativeObj = brainstormResult.narratives_created[i];
      const narrativeText = narrativeObj.narrative;

      this.logger.log(
        `  [${i + 1}/${brainstormResult.narratives_created.length}] Testing: '${narrativeText.substring(0, 50)}...'`,
      );
      this.logger.log('     → Audience Council evaluation...');

      const audienceEvals =
        await this.audienceCouncilService.evaluateWithAudienceCouncil(
          narrativeText,
          content,
        );
      const audienceStats = this.aggregateScores(audienceEvals);

      // Production score based on consensus
      const consensusMap: Record<string, number> = {
        high: 9.0,
        medium: 8.0,
        split: 7.0,
      };
      const productionScore =
        consensusMap[narrativeObj.consensus || 'medium'] || 8.0;

      const overallScore =
        productionScore * 0.4 + audienceStats.average * 0.6;

      evaluations.push({
        narrative: narrativeText,
        angle: narrativeObj.angle || 'collaborative',
        reasoning:
          narrativeObj.key_discussion ||
          'Created through council brainstorming',
        overall_score: overallScore,
        production_avg: productionScore,
        audience_avg: audienceStats.average,
        audience_council: audienceEvals,
        production_council: {
          collaborative_metadata: {
            created_collaboratively: true,
            created_by: narrativeObj.created_by || 'Production Council',
            consensus: narrativeObj.consensus || 'medium',
          },
        } as any,
        creation_process: narrativeObj.key_discussion || '',
      });
    }

    // Step 3: Rank and add insights
    evaluations.sort((a, b) => b.overall_score - a.overall_score);
    evaluations.forEach((evaluation, index) => {
      evaluation.rank = index + 1;
    });

    for (const evaluation of evaluations) {
      evaluation.insights = this.generateInsights(evaluation);
      evaluation.conflicts = this.detectConflictsDeliberative(
        evaluation.production_avg,
        evaluation.audience_council,
      );
      evaluation.demographic_breakdown =
        this.analyzeDemographics(evaluation.audience_council);
    }

    this.logger.log('\n✅ Council Brainstorming Complete!');
    this.logger.log(
      `   Council created ${evaluations.length} conflict-driven narratives`,
    );
    this.logger.log(
      `   Top Score: ${evaluations[0].overall_score.toFixed(1)}/10`,
    );
    this.logger.log('   All narratives centered on PRIMARY CONFLICT');

    return [evaluations, brainstormResult, analysis];
  }

  // ============================================================================
  // AGGREGATE SCORES
  // ============================================================================

  aggregateScores(
    evaluations: Record<string, PersonaEvaluation>,
  ): ScoreStats {
    const scores = Object.values(evaluations).map((e) => e.score || 0);

    return {
      average:
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0,
      min: scores.length > 0 ? Math.min(...scores) : 0,
      max: scores.length > 0 ? Math.max(...scores) : 0,
      count: scores.length,
    };
  }

  // ============================================================================
  // DETECT CONFLICTS DELIBERATIVE
  // ============================================================================

  detectConflictsDeliberative(
    productionAvg: number,
    audienceEvals: Record<string, PersonaEvaluation>,
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];

    // Calculate audience average
    const audScores = Object.values(audienceEvals).map((e) => e.score || 0);
    const audAvg =
      audScores.length > 0
        ? audScores.reduce((a, b) => a + b, 0) / audScores.length
        : 0;

    // Production vs Audience gap
    if (Math.abs(productionAvg - audAvg) > 2) {
      if (productionAvg > audAvg) {
        conflicts.push({
          type: 'production_audience_gap',
          severity: 'high',
          description: `Production council confident (${productionAvg.toFixed(1)}) but audience lukewarm (${audAvg.toFixed(1)})`,
        });
      } else {
        conflicts.push({
          type: 'production_audience_gap',
          severity: 'medium',
          description: `Audience loves it (${audAvg.toFixed(1)}) but production council hesitant (${productionAvg.toFixed(1)})`,
        });
      }
    }

    // Demographic polarization
    const audScoresSorted = [...audScores].sort((a, b) => a - b);
    if (audScoresSorted.length >= 2) {
      const scoreRange =
        audScoresSorted[audScoresSorted.length - 1] - audScoresSorted[0];
      if (scoreRange > 4) {
        const entries = Object.entries(audienceEvals);
        const highScorer = entries.reduce((max, curr) =>
          (curr[1].score || 0) > (max[1].score || 0) ? curr : max,
        );
        const lowScorer = entries.reduce((min, curr) =>
          (curr[1].score || 0) < (min[1].score || 0) ? curr : min,
        );

        conflicts.push({
          type: 'demographic_polarization',
          severity: 'medium',
          description: `Polarizing: ${highScorer[0]} scores ${highScorer[1].score}, ${lowScorer[0]} scores ${lowScorer[1].score} (range: ${scoreRange.toFixed(1)} points)`,
        });
      }
    }

    // Check for audience rejections
    const rejections = Object.entries(audienceEvals)
      .filter(
        ([, evalData]) =>
          evalData.would_click === 'no' || evalData.would_watch === 'no',
      )
      .map(([name]) => name);

    if (rejections.length >= 3) {
      conflicts.push({
        type: 'audience_rejection',
        severity: 'high',
        description: `Multiple personas unlikely to engage: ${rejections.slice(0, 3).join(', ')}`,
      });
    }

    return conflicts;
  }

  // ============================================================================
  // ANALYZE DEMOGRAPHICS
  // ============================================================================

  analyzeDemographics(
    audienceEvals: Record<string, PersonaEvaluation>,
  ): DemographicAnalysis {
    const demographics: DemographicAnalysis = {
      by_age: {},
      by_gender: {},
      by_segment: {},
      strong_appeal: [],
      weak_appeal: [],
    };

    const tempAge: Record<string, number[]> = {};
    const tempGender: Record<string, number[]> = {};
    const tempSegment: Record<string, number[]> = {};

    for (const [personaId, evalData] of Object.entries(audienceEvals)) {
      const score = evalData.score || 0;

      // Find persona config
      const persona = AUDIENCE_COUNCIL.find((p) => p.roleId === personaId);
      if (!persona?.profile) continue;

      const { age, gender, segment } = persona.profile;
      const name = persona.roleName || personaId;

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

      // Strong/weak appeal
      if (score >= 8) {
        demographics.strong_appeal.push({ persona: name, score });
      } else if (score <= 5) {
        demographics.weak_appeal.push({ persona: name, score });
      }
    }

    // Calculate averages
    for (const [ageGroup, scores] of Object.entries(tempAge)) {
      demographics.by_age[ageGroup] =
        scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    for (const [gender, scores] of Object.entries(tempGender)) {
      demographics.by_gender[gender] =
        scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    for (const [segment, scores] of Object.entries(tempSegment)) {
      demographics.by_segment[segment] =
        scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    return demographics;
  }

  // ============================================================================
  // GENERATE INSIGHTS
  // ============================================================================

  generateInsights(evaluation: EvaluationResult): string[] {
    const insights: string[] = [];

    const prodAvg = evaluation.production_avg || 0;
    const audAvg = evaluation.audience_avg || 0;
    const overall = evaluation.overall_score || 0;

    // Overall assessment
    if (overall >= 8) {
      insights.push(
        `Strong candidate (overall ${overall.toFixed(1)}/10) - high confidence`,
      );
    } else if (overall >= 7) {
      insights.push(
        `Good candidate (overall ${overall.toFixed(1)}/10) - moderate confidence`,
      );
    } else {
      insights.push(
        `Weak candidate (overall ${overall.toFixed(1)}/10) - consider alternatives`,
      );
    }

    // Production vs Audience alignment
    const gap = Math.abs(prodAvg - audAvg);
    if (prodAvg > audAvg + 1) {
      insights.push(
        `Production confident (${prodAvg.toFixed(1)}) but audience response lukewarm (${audAvg.toFixed(1)}) - ${gap.toFixed(1)}pt gap`,
      );
    } else if (audAvg > prodAvg + 1) {
      insights.push(
        `Audience loves it (${audAvg.toFixed(1)}) despite production hesitation (${prodAvg.toFixed(1)}) - ${gap.toFixed(1)}pt gap`,
      );
    } else {
      insights.push(
        `Good alignment between production (${prodAvg.toFixed(1)}) and audience (${audAvg.toFixed(1)})`,
      );
    }

    // Demographics insights
    const demographics = evaluation.demographic_breakdown;
    if (demographics) {
      const strongAppeal = demographics.strong_appeal || [];
      const weakAppeal = demographics.weak_appeal || [];

      if (strongAppeal.length > 0) {
        const personas = strongAppeal
          .slice(0, 3)
          .map((p) => p.persona)
          .join(', ');
        const avgScore =
          strongAppeal
            .slice(0, 3)
            .reduce((sum, p) => sum + p.score, 0) /
          Math.min(strongAppeal.length, 3);
        insights.push(
          `Strong appeal with: ${personas} (avg ${avgScore.toFixed(1)})`,
        );
      }

      if (weakAppeal.length > 0) {
        const personas = weakAppeal
          .slice(0, 3)
          .map((p) => p.persona)
          .join(', ');
        const avgScore =
          weakAppeal.slice(0, 3).reduce((sum, p) => sum + p.score, 0) /
          Math.min(weakAppeal.length, 3);
        insights.push(
          `Weak appeal with: ${personas} (avg ${avgScore.toFixed(1)})`,
        );
      }

      // Target audience by segment
      const bySegment = demographics.by_segment || {};
      if (Object.keys(bySegment).length > 0) {
        const sortedSegments = Object.entries(bySegment).sort(
          (a, b) => b[1] - a[1],
        );
        const topSegment = sortedSegments[0];
        insights.push(
          `Best for: ${topSegment[0].replace(/_/g, ' ')} audience (${topSegment[1].toFixed(1)}/10)`,
        );
      }
    }

    return insights;
  }
}
