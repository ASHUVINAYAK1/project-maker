import { Command } from '@tauri-apps/plugin-shell';

/**
 * Shell Automation Service
 * Provides methods to execute CLI commands and capture output
 */

export interface CommandResult {
    code: number | null;
    stdout: string;
    stderr: string;
}

export interface CommandOptions {
    cwd?: string;
    args?: string[];
    env?: Record<string, string>;
    onStdout?: (line: string) => void;
    onStderr?: (line: string) => void;
}

class ShellService {
    private isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

    /**
     * Execute a command and wait for completion
     */
    async execute(program: string, options: CommandOptions = {}): Promise<CommandResult> {
        console.log(`[ShellService] Executing: ${program} ${options.args?.join(' ') || ''}`, { cwd: options.cwd });

        if (!this.isTauri) {
            console.warn('[ShellService] Running in browser. Mocking command execution.');
            return this.mockExecute(program, options);
        }

        try {
            const command = Command.create(program, options.args || [], {
                cwd: options.cwd,
                env: options.env,
            });

            const stdoutLines: string[] = [];
            const stderrLines: string[] = [];

            command.stdout.on('data', (line) => {
                stdoutLines.push(line);
                options.onStdout?.(line);
            });

            command.stderr.on('data', (line) => {
                stderrLines.push(line);
                options.onStderr?.(line);
            });

            const output = await command.execute();

            return {
                code: output.code,
                stdout: stdoutLines.join('\n'),
                stderr: stderrLines.join('\n'),
            };
        } catch (error) {
            console.error(`[ShellService] Execution failed: ${program}`, error);
            return {
                code: 1,
                stdout: '',
                stderr: String(error),
            };
        }
    }

    /**
     * Mock execution for browser environment
     */
    private async mockExecute(program: string, options: CommandOptions): Promise<CommandResult> {
        const isError = Math.random() < 0.05; // 5% chance of mock failure

        // Simulate latency
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        if (isError) {
            const msg = `Mock error: Command '${program}' failed.`;
            options.onStderr?.(msg);
            return { code: 1, stdout: '', stderr: msg };
        }

        const msg = `Mock success: ${program} ${options.args?.join(' ') || ''} executed successfully.`;
        options.onStdout?.(msg);
        return { code: 0, stdout: msg, stderr: '' };
    }
}

export const shellService = new ShellService();
export default shellService;
