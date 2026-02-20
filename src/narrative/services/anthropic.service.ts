import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Anthropic Service - Wrapper for Claude API
 * Converted from TypeORM to Mongoose (mostly unchanged)
 * Original: backend-nestjs/src/evaluation/evaluation-engine.service.ts (API calls)
 */

@Injectable()
export class AnthropicService {
  private readonly logger = new Logger(AnthropicService.name);
  private readonly client: Anthropic;
  private readonly model = 'claude-sonnet-4-5-20250929';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Get the Anthropic client instance
   */
  getClient(): Anthropic {
    return this.client;
  }

  /**
   * Get the default model name
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Call API with automatic retry logic
   */
  async callWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    initialDelay = 2000,
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error;
        }
        const delay = initialDelay * Math.pow(2, attempt);
        this.logger.warn(
          `API error (attempt ${attempt + 1}/${maxRetries}): ${error.message?.substring(0, 100)}`,
        );
        this.logger.log(`Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * Create a message using Claude API
   */
  async createMessage(params: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    max_tokens?: number;
    temperature?: number;
    system?: string;
  }): Promise<any> {
    this.logger.log('🤖 Calling Claude API...');
    this.logger.debug(`System prompt length: ${params.system?.length || 0} chars`);
    this.logger.debug(`User prompt length: ${params.messages[0]?.content?.length || 0} chars`);
    this.logger.debug(`Options: max_tokens=${params.max_tokens || 4000}, temperature=${params.temperature || 0.7}`);

    try {
      const response = await this.callWithRetry(() =>
        this.client.messages.create({
          model: this.model,
          max_tokens: params.max_tokens || 4000,
          temperature: params.temperature || 0.7,
          system: params.system,
          messages: params.messages,
        }),
      );

      this.logger.log('✅ Claude API response received');
      this.logger.debug(`Response length: ${response.content[0]?.text?.length || 0} chars`);
      this.logger.debug(`Usage: input=${response.usage?.input_tokens}, output=${response.usage?.output_tokens}`);

      return response;
    } catch (error) {
      this.logger.error(`❌ Claude API call failed: ${error.message}`, error.stack);
      throw new Error(`Failed to call Claude API: ${error.message}`);
    }
  }

  /**
   * Extract JSON from Claude response
   * Handles markdown code blocks
   */
  extractJSON(text: string): string {
    let content = text;
    if (content.includes('```json')) {
      content = content.split('```json')[1].split('```')[0];
    } else if (content.includes('```')) {
      content = content.split('```')[1].split('```')[0];
    }
    return content.trim();
  }

  /**
   * Parse JSON response from Claude
   */
  parseJSONResponse<T>(response: any): T {
    const firstContent = response.content[0];
    const contentText = this.extractJSON(
      firstContent.type === 'text' ? firstContent.text : '',
    );
    return JSON.parse(contentText);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Test connection to Anthropic API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }],
      });
      return response.content.length > 0;
    } catch (error) {
      this.logger.error('Failed to connect to Anthropic API', error.message);
      return false;
    }
  }
}
