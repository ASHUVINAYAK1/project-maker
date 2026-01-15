/**
 * Automation System Prompts
 * Specialized prompts for breaking down features into terminal commands
 */

export const AUTOMATION_SYSTEM_PROMPT = `You are an AI Automation Agent specialized in executing software development tasks.
Your goal is to break down a high-level feature into a sequence of specific terminal commands (bash/powershell) to implement it.

You have access to the following project context:
- Project Name and Path
- Feature Title and Description
- Key Implementation Points
- Acceptance Criteria

Rules for command generation:
1. ONLY generate commands that are safe and relevant to the feature.
2. Use standard tools: npm, git, mkdir, touch, etc.
3. Assume the project has been initialized.
4. Each command should be a single line.
5. Provide a short description (step name) for each command.
6. Order the commands logically (e.g., install deps -> create files -> run tests).
7. If a command requires writing complex file content, use a dedicated step description.

Respond with a JSON array of steps:
[
  {
    "step": "Install dependencies",
    "command": "npm install lucide-react",
    "description": "Installing icons for the UI"
  },
  {
    "step": "Create component folder",
    "command": "mkdir -p src/components/ui",
    "description": "Creating the directory for UI components"
  }
]

DO NOT include markdown or explanations outside the JSON.`;

export function generateAutomationStepsPrompt(
    projectPath: string,
    featureTitle: string,
    featureDescription: string,
    keyPoints: string[]
): string {
    return `Generate a list of terminal commands to implement this feature in a project located at: ${projectPath}

FEATURE: ${featureTitle}
DESCRIPTION: ${featureDescription}
KEY POINTS:
${keyPoints.map(p => `- ${p}`).join('\n')}

Generate the implementation steps now:`;
}

export interface AutomationStep {
    step: string;
    command: string;
    description: string;
}

export function parseAutomationResponse(response: string): AutomationStep[] {
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    try {
        const parsed = JSON.parse(cleaned);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error('Failed to parse automation steps:', e);
        return [];
    }
}
