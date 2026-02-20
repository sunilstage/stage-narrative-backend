/**
 * Story Architect Service - Conflict analysis and content structure
 * Extracted from evaluation-engine.service.ts
 * Uses Mongoose Models instead of TypeORM Repositories
 */

import { Injectable, Logger } from '@nestjs/common';
import { AnthropicService } from './anthropic.service';

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

interface CharacterAnalysis {
  name: string;
  role: string;
  external_goal: string;
  internal_need: string;
  stakes: string;
  arc_type: string;
}

interface ConflictIdentified {
  conflict_id: string;
  type: string;
  description: string;
  who_vs_what: string;
  stakes: string;
  emotional_weight: string;
  scores: {
    audience_appeal: number;
    uniqueness: number;
    genre_alignment: number;
    pitch_clarity: number;
    dramatic_intensity: number;
    total: number;
  };
}

interface PrimaryConflict {
  conflict_id: string;
  statement: string;
  why_this_is_primary: string;
  marketing_angle: string;
}

interface ContentAnalysis {
  characters: CharacterAnalysis[];
  conflicts_identified: ConflictIdentified[];
  conflict_relationships: string;
  thematic_core: {
    central_question: string;
    emotional_core: string;
    themes: string[];
  };
  primary_conflict: PrimaryConflict;
  secondary_conflicts: Array<{
    conflict_id: string;
    statement: string;
    relationship_to_primary: string;
  }>;
  marketing_strategy: {
    marketing_hook: string;
    tagline_options: string[];
    positioning_vs_competitors: string;
    target_emotional_response: string;
  };
  edge_case_handling: {
    story_structure: string;
    complexity_notes: string;
    marketing_challenges: string;
  };
  logline: string;
  genre_positioning: string;
  usps: string[];
  main_conflict?: string;
  thematic_question?: string;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class StoryArchitectService {
  private readonly logger = new Logger(StoryArchitectService.name);

  constructor(private anthropicService: AnthropicService) {}

  // ============================================================================
  // ANALYZE CONTENT - Deep Story Architect Analysis
  // ============================================================================

  async analyzeContent(content: ContentInfo): Promise<ContentAnalysis> {
    const prompt = `
You are the Chief Narrative Strategist (Story Architect) at STAGE OTT platform.

Your expertise: Three-act structure, character arcs, conflict escalation, dramatic tension, Hero's Journey, audience psychology, and marketing narrative craft.

YOUR MISSION: Perform a DEEP STORY ANALYSIS to identify the primary dramatic conflict that should anchor all marketing.

IMPORTANT: The title is intentionally withheld. Analyze purely based on story content.

═══════════════════════════════════════════════════════════════
CONTENT INFORMATION
═══════════════════════════════════════════════════════════════
Genre: ${content.genre || 'Not specified'}
Runtime: ${content.runtime || 'Not specified'} minutes
Target Audience: ${content.target_audience || 'Not specified'}
Themes: ${content.themes || 'Not specified'}
Tone: ${content.tone || 'Not specified'}

STORY CONTENT:
${content.summary || content.script || 'Not provided'}

═══════════════════════════════════════════════════════════════
ANALYSIS PROTOCOL: STORY ARCHITECT DEEP DIVE
═══════════════════════════════════════════════════════════════

PHASE 1: CHARACTER-LEVEL ANALYSIS
For EACH major character (anyone with significant screen time/impact):
- EXTERNAL GOAL: What do they want? (tangible objective)
- INTERNAL NEED: What do they actually need to grow? (psychological/emotional transformation)
- PERSONAL STAKES: What happens if they fail?
- ARC TYPE: Change arc / Flat arc / Corruption arc / Redemption arc

PHASE 2: CONFLICT EXTRACTION & MAPPING
Identify ALL significant conflicts:
- Character vs Character (interpersonal)
- Character vs Self (internal struggle)
- Character vs Society (systemic)
- Character vs Nature/Fate (external forces)
- Character vs Time (urgency/deadline)

For EACH conflict, extract:
- WHO is in conflict with WHAT/WHOM
- WHAT is at stake
- WHY it matters emotionally

Then map CONFLICT RELATIONSHIPS:
- PARALLEL: Independent storylines with separate conflicts
- NESTED: One conflict enables/serves another
- CONVERGING: Separate conflicts merge into one climactic showdown
- CONTRASTING: Conflicts present thematic opposites

PHASE 3: THEMATIC SYNTHESIS
- What is the UNIFYING THEMATIC QUESTION the story asks?
- What is the EMOTIONAL CORE (what viewers should FEEL)?
- What PHILOSOPHICAL/MORAL question drives the narrative?

PHASE 4: MARKETING VIABILITY SCORING
For EACH identified conflict, score (1-10):
- AUDIENCE APPEAL: How universally relatable/compelling?
- UNIQUENESS: How different from competitors?
- GENRE ALIGNMENT: Does it deliver on genre promise?
- PITCH CLARITY: Can it be explained in one sentence?
- DRAMATIC INTENSITY: How high are the stakes?
- TOTAL SCORE: Sum of above (max 50)

PHASE 5: PRIMARY CONFLICT SELECTION
Rules:
1. Highest scored conflict = PRIMARY
2. IF multiple conflicts within 5 points: Create UNIFIED PRIMARY (thematic umbrella covering all)
3. IF dual protagonists with equal weight: Unify under thematic connection
4. IF ensemble cast: Find the thematic throughline

Return PRIMARY CONFLICT as:
- CLEAR, ONE-SENTENCE dramatic question/tension
- Communicates WHO, WHAT'S AT STAKE, WHY IT MATTERS
- Can anchor ALL marketing narratives

PHASE 6: MARKETING STRATEGY
- MARKETING HOOK: One killer sentence for trailers/posters
- TAGLINE OPTIONS: 2-3 options that center the conflict
- POSITIONING: How this conflict differentiates from competitors

═══════════════════════════════════════════════════════════════
RETURN AS JSON
═══════════════════════════════════════════════════════════════
{
  "characters": [
    {
      "name": "Character name",
      "role": "Protagonist/Antagonist/etc",
      "external_goal": "What they want",
      "internal_need": "What they need to grow",
      "stakes": "What happens if they fail",
      "arc_type": "Change/Flat/Corruption/Redemption"
    }
  ],

  "conflicts_identified": [
    {
      "conflict_id": "C1",
      "type": "character_vs_character/self/society/nature/time",
      "description": "Clear description of the conflict",
      "who_vs_what": "Protagonist vs Antagonist / Self / Society / etc",
      "stakes": "What's at risk",
      "emotional_weight": "Why this matters",
      "scores": {
        "audience_appeal": 8,
        "uniqueness": 7,
        "genre_alignment": 9,
        "pitch_clarity": 8,
        "dramatic_intensity": 9,
        "total": 41
      }
    }
  ],

  "conflict_relationships": "PARALLEL/NESTED/CONVERGING/CONTRASTING with explanation",

  "thematic_core": {
    "central_question": "The philosophical/emotional question the story asks",
    "emotional_core": "What viewers should FEEL",
    "themes": ["Theme 1", "Theme 2"]
  },

  "primary_conflict": {
    "conflict_id": "C1",
    "statement": "Clear one-sentence dramatic tension (WHO wants WHAT, WHAT stands in their way, WHAT happens if they fail)",
    "why_this_is_primary": "Reasoning for why this conflict scored highest / unifies the story",
    "marketing_angle": "How to use this conflict to sell the content"
  },

  "secondary_conflicts": [
    {
      "conflict_id": "C2",
      "statement": "Brief description",
      "relationship_to_primary": "How it supports/contrasts with primary"
    }
  ],

  "marketing_strategy": {
    "marketing_hook": "One killer sentence for trailers - conflict-driven",
    "tagline_options": [
      "Option 1 centering conflict",
      "Option 2 centering conflict"
    ],
    "positioning_vs_competitors": "How the primary conflict differentiates us",
    "target_emotional_response": "Curiosity/Fear/Excitement/etc"
  },

  "edge_case_handling": {
    "story_structure": "Single protagonist / Dual protagonist / Ensemble / Anthology / Non-linear",
    "complexity_notes": "Any special considerations (twist protection, multiple timelines, etc)",
    "marketing_challenges": "Challenges in marketing this conflict"
  },

  "logline": "One sentence capturing the primary conflict",
  "genre_positioning": "How to position this in market",
  "usps": ["USP 1", "USP 2", "USP 3"]
}

Be thorough, strategic, and conflict-obsessed. The primary conflict you identify will guide ALL marketing narratives.
`;

    const response = await this.anthropicService.createMessage({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 6000,
    });

    const analysis: ContentAnalysis =
      this.anthropicService.parseJSONResponse<ContentAnalysis>(response);

    // Add convenience fields
    analysis.main_conflict = analysis.primary_conflict?.statement || '';
    analysis.thematic_question =
      analysis.thematic_core?.central_question || '';

    return analysis;
  }

  /**
   * Quick conflict extraction (lighter version)
   * For when full analysis is not needed
   */
  async extractPrimaryConflict(content: ContentInfo): Promise<string> {
    const prompt = `
You are a Story Architect. Extract the PRIMARY DRAMATIC CONFLICT from this content in ONE SENTENCE.

CONTENT:
Genre: ${content.genre}
Summary: ${content.summary || content.script}

Return ONLY the conflict statement - no explanation needed.
Format: "WHO wants WHAT, but WHAT/WHO stands in their way"

Keep it under 30 words, clear and punchy.
`;

    const response = await this.anthropicService.createMessage({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.5,
    });

    const firstContent = response.content[0];
    return firstContent.type === 'text' ? firstContent.text.trim() : '';
  }

  /**
   * Validate if a narrative centers on the given conflict
   */
  async validateConflictAlignment(
    narrative: string,
    primaryConflict: string,
  ): Promise<{ aligned: boolean; score: number; reasoning: string }> {
    const prompt = `
You are a Story Architect. Evaluate if this marketing narrative centers on the PRIMARY CONFLICT.

PRIMARY CONFLICT:
"${primaryConflict}"

MARKETING NARRATIVE:
"${narrative}"

Score 1-10:
- 10: Narrative clearly and directly centers on the primary conflict
- 7-9: Narrative mentions the conflict but also emphasizes other elements
- 4-6: Narrative tangentially references the conflict
- 1-3: Narrative focuses on peripheral elements, not the conflict

Return JSON:
{
  "aligned": <true if score >= 7, false otherwise>,
  "score": <1-10>,
  "reasoning": "<brief explanation>"
}
`;

    const response = await this.anthropicService.createMessage({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
    });

    return this.anthropicService.parseJSONResponse<{
      aligned: boolean;
      score: number;
      reasoning: string;
    }>(response);
  }
}
