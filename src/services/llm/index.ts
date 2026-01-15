export { OllamaClient, ollamaClient } from './ollama';
export type { OllamaModel, OllamaGenerateRequest, OllamaGenerateResponse } from './ollama';
export {
    FEATURE_GENERATION_SYSTEM_PROMPT,
    generateFeaturePrompt,
    parseFeatureResponse,
    RECOMMENDED_MODELS
} from './prompts';
