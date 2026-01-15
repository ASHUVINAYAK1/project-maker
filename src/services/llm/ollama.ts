/**
 * Ollama API Client
 * Handles communication with the local Ollama server for LLM-based feature generation
 */

export interface OllamaModel {
    name: string;
    size: number;
    digest: string;
    modified_at: string;
}

export interface OllamaGenerateRequest {
    model: string;
    prompt: string;
    system?: string;
    stream?: boolean;
    options?: {
        temperature?: number;
        top_p?: number;
        num_predict?: number;
    };
}

export interface OllamaGenerateResponse {
    model: string;
    response: string;
    done: boolean;
    context?: number[];
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    eval_count?: number;
}

export interface OllamaTagsResponse {
    models: OllamaModel[];
}

export class OllamaClient {
    private baseUrl: string;

    constructor(baseUrl: string = 'http://localhost:11434') {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    }

    /**
     * Check if Ollama server is running and accessible
     */
    async isAvailable(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Get list of available models
     */
    async listModels(): Promise<OllamaModel[]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.statusText}`);
            }
            const data: OllamaTagsResponse = await response.json();
            return data.models || [];
        } catch (error) {
            console.error('Error fetching Ollama models:', error);
            throw error;
        }
    }

    /**
     * Generate a completion (non-streaming)
     */
    async generate(request: OllamaGenerateRequest): Promise<string> {
        const response = await fetch(`${this.baseUrl}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...request,
                stream: false,
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama request failed: ${response.statusText}`);
        }

        const data: OllamaGenerateResponse = await response.json();
        return data.response;
    }

    /**
     * Generate a completion with streaming
     * Returns an async generator that yields partial responses
     */
    async *generateStream(
        request: OllamaGenerateRequest
    ): AsyncGenerator<string, void, unknown> {
        const response = await fetch(`${this.baseUrl}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...request,
                stream: true,
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama request failed: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body');
        }

        const decoder = new TextDecoder();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value, { stream: true });
                const lines = text.split('\n').filter((line) => line.trim());

                for (const line of lines) {
                    try {
                        const data: OllamaGenerateResponse = JSON.parse(line);
                        if (data.response) {
                            yield data.response;
                        }
                        if (data.done) {
                            return;
                        }
                    } catch {
                        // Skip malformed JSON lines
                        continue;
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Update base URL
     */
    setBaseUrl(url: string): void {
        this.baseUrl = url.replace(/\/$/, '');
    }

    /**
     * Get current base URL
     */
    getBaseUrl(): string {
        return this.baseUrl;
    }
}

// Default singleton instance
export const ollamaClient = new OllamaClient();
