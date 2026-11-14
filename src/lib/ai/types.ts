/** Provider-agnostic AI contract. Everything model-related goes through this. */

export interface ModerationVerdict {
  flagged: boolean;
  categories: string[];
  reason: string;
  /** 'ai' when the model ran, 'keyword' when the AI path failed and we fell back */
  engine: 'ai' | 'keyword';
}

export interface ComposeInput {
  aspiration: string;
}

export interface ComposeOutput {
  message: string;
  sources: Array<{ title: string; source: string; url?: string | null }>;
}

export interface AiProvider {
  readonly name: string;
  moderate(text: string): Promise<ModerationVerdict>;
  compose(input: ComposeInput): Promise<ComposeOutput>;
}

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiUnavailableError';
  }
}
