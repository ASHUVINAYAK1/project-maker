/**
 * LLM Prompts for Feature Generation
 * Structured prompts for generating project features from descriptions
 */

import type { LLMGeneratedFeature } from '../../types';

/**
 * System prompt for the feature generation task
 */
export const FEATURE_GENERATION_SYSTEM_PROMPT = `You are an expert software architect and project planner. Your task is to analyze a project description and generate a list of well-defined features that can be implemented incrementally.

For each feature you generate, provide:
1. A clear, concise title (max 60 characters)
2. A detailed description of what the feature does
3. Key implementation points (3-5 bullet points)
4. Acceptance criteria (how to verify the feature works)
5. Suggested tests to write
6. Estimated complexity (low, medium, or high)
7. Dependencies on other features (if any)

IMPORTANT RULES:
- Generate 5-12 features depending on project complexity
- Start with foundational features (setup, core data models)
- Progress to user-facing features
- End with polish features (error handling, UX improvements)
- Each feature should be independently implementable within 1-4 hours
- Be specific and actionable, not vague
- Use the exact JSON format specified

You MUST respond with valid JSON only. No markdown, no explanations outside the JSON.`;

/**
 * Generate the user prompt for feature generation
 */
export function generateFeaturePrompt(
    projectName: string,
    projectDescription: string
): string {
    return `Analyze the following project and generate a comprehensive list of features:

PROJECT NAME: ${projectName}

PROJECT DESCRIPTION:
${projectDescription}

Generate a JSON response with the following structure:
{
  "features": [
    {
      "title": "Feature Title",
      "description": "Detailed description of what this feature does",
      "keyPoints": [
        "Implementation point 1",
        "Implementation point 2",
        "Implementation point 3"
      ],
      "acceptanceCriteria": [
        "User can do X",
        "System displays Y",
        "Data is persisted correctly"
      ],
      "suggestedTests": [
        "Test that X works correctly",
        "Test edge case Y"
      ],
      "estimatedComplexity": "low|medium|high",
      "dependencies": ["Other Feature Title if dependent"]
    }
  ]
}

Generate the features now as valid JSON:`;
}

/**
 * Parse the LLM response and extract features
 */
export function parseFeatureResponse(response: string): LLMGeneratedFeature[] {
    // Clean the response - remove markdown code blocks if present
    let cleaned = response.trim();

    // Remove markdown code block markers
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
    }

    if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
    }

    cleaned = cleaned.trim();

    try {
        const parsed = JSON.parse(cleaned);

        // Validate the structure
        if (!parsed.features || !Array.isArray(parsed.features)) {
            throw new Error('Response does not contain a features array');
        }

        // Validate and normalize each feature
        const features: LLMGeneratedFeature[] = parsed.features.map((f: any, index: number) => {
            if (!f.title || typeof f.title !== 'string') {
                throw new Error(`Feature ${index + 1} is missing a valid title`);
            }

            return {
                title: f.title.slice(0, 100), // Limit title length
                description: f.description || '',
                keyPoints: Array.isArray(f.keyPoints) ? f.keyPoints.filter((p: any) => typeof p === 'string') : [],
                acceptanceCriteria: Array.isArray(f.acceptanceCriteria) ? f.acceptanceCriteria.filter((c: any) => typeof c === 'string') : [],
                suggestedTests: Array.isArray(f.suggestedTests) ? f.suggestedTests.filter((t: any) => typeof t === 'string') : [],
                estimatedComplexity: ['low', 'medium', 'high'].includes(f.estimatedComplexity)
                    ? f.estimatedComplexity
                    : 'medium',
                dependencies: Array.isArray(f.dependencies) ? f.dependencies.filter((d: any) => typeof d === 'string') : [],
            };
        });

        return features;
    } catch (error) {
        console.error('Failed to parse LLM response:', error);
        console.error('Response was:', response);
        throw new Error(`Failed to parse feature response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Recommended models for feature generation
 */
export const RECOMMENDED_MODELS = [
    {
        name: 'qwen2.5-coder:7b',
        description: 'Best balance of speed and quality for coding tasks',
        size: '4.7GB',
    },
    {
        name: 'qwen2.5-coder:14b',
        description: 'Higher quality, slower generation',
        size: '9GB',
    },
    {
        name: 'deepseek-coder-v2:16b',
        description: 'Excellent for complex project analysis',
        size: '9GB',
    },
    {
        name: 'codellama:7b',
        description: 'Good alternative for code-focused tasks',
        size: '3.8GB',
    },
    {
        name: 'llama3.2:3b',
        description: 'Fast, lightweight option for simple projects',
        size: '2GB',
    },
];
