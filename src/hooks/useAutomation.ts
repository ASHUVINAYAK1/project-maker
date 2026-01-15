import { useState, useCallback } from 'react';
import { ollamaClient } from '../services/llm';
import {
    AUTOMATION_SYSTEM_PROMPT,
    generateAutomationStepsPrompt,
    parseAutomationResponse,
} from '../services/automation/prompts';
import { shellService } from '../services/automation/shell';
import { useFeatureStore, useSettingsStore, useProjectStore } from '../stores';

export interface UseAutomationResult {
    isRunning: boolean;
    currentStep: string | null;
    error: string | null;
    startAutomation: (featureId: string) => Promise<void>;
    stopAutomation: () => void;
}

export function useAutomation(): UseAutomationResult {
    const [isRunning, setIsRunning] = useState(false);
    const [currentStep, setCurrentStep] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { updateAutomationStatus, addAutomationLog, clearAutomationLogs } = useFeatureStore();
    const settings = useSettingsStore((state) => state.settings);
    const getFeatureById = useFeatureStore((state) => state.getFeatureById);
    const getActiveProject = useProjectStore((state) => state.getActiveProject);

    const startAutomation = useCallback(async (featureId: string) => {
        const feature = getFeatureById(featureId);
        const project = getActiveProject();

        if (!feature || !project) {
            setError('Feature or Project not found');
            return;
        }

        setIsRunning(true);
        setError(null);
        setCurrentStep('Planning implementation...');

        await clearAutomationLogs(featureId);
        await updateAutomationStatus(featureId, 'running');
        await addAutomationLog(featureId, 'Analyzer', 'Analyzing feature for implementation steps...', 'info');

        try {
            // 1. Generate Steps using LLM
            const prompt = generateAutomationStepsPrompt(
                project.path,
                feature.title,
                feature.description,
                feature.keyPoints
            );

            const response = await ollamaClient.generate({
                model: settings.ollama.model,
                system: AUTOMATION_SYSTEM_PROMPT,
                prompt: prompt,
            });

            const steps = parseAutomationResponse(response);

            if (steps.length === 0) {
                throw new Error('AI failed to generate implementation steps.');
            }

            await addAutomationLog(featureId, 'Planner', `Generated ${steps.length} implementation steps.`, 'success');

            // 2. Execute Steps
            for (const step of steps) {
                setCurrentStep(step.step);
                await addAutomationLog(featureId, 'Executor', `Starting step: ${step.step}`, 'info');
                await addAutomationLog(featureId, 'Command', `$ ${step.command}`, 'info');

                const result = await shellService.execute(step.command.split(' ')[0], {
                    args: step.command.split(' ').slice(1),
                    cwd: project.path,
                    onStdout: (line) => addAutomationLog(featureId, 'stdout', line, 'info'),
                    onStderr: (line) => addAutomationLog(featureId, 'stderr', line, 'warning'),
                });

                if (result.code !== 0) {
                    throw new Error(`Step "${step.step}" failed with code ${result.code}: ${result.stderr}`);
                }

                await addAutomationLog(featureId, 'Executor', `Completed step: ${step.step}`, 'success');
            }

            await updateAutomationStatus(featureId, 'success');
            await addAutomationLog(featureId, 'Finalizer', 'Feature implemented successfully!', 'success');
            setCurrentStep('Finished');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Automation failed';
            setError(msg);
            await updateAutomationStatus(featureId, 'failed');
            await addAutomationLog(featureId, 'Error', msg, 'error');
        } finally {
            setIsRunning(false);
        }
    }, [getFeatureById, getActiveProject, settings.ollama.model, updateAutomationStatus, addAutomationLog, clearAutomationLogs]);

    const stopAutomation = useCallback(() => {
        setIsRunning(false);
        setCurrentStep(null);
    }, []);

    return {
        isRunning,
        currentStep,
        error,
        startAutomation,
        stopAutomation,
    };
}
