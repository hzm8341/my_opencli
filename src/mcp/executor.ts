/**
 * Command executor for MCP tools.
 */

import { type CliCommand, type CommandArgs } from '../registry.js';
import { shouldUseBrowserSession } from '../capabilityRouting.js';
import { executeCommand } from '../execution.js';
import { getBrowserFactory, browserSession } from '../runtime.js';
import { toMcpError } from './errors.js';

export interface ExecuteResult {
  success: boolean;
  data?: unknown;
  error?: ReturnType<typeof toMcpError>;
}

/**
 * Execute a command as an MCP tool.
 * Handles browser session lifecycle automatically.
 */
export async function executeTool(
  cmd: CliCommand,
  args: Record<string, unknown>,
): Promise<ExecuteResult> {
  try {
    let result: unknown;

    if (shouldUseBrowserSession(cmd)) {
      const BrowserFactory = getBrowserFactory();
      result = await browserSession(
        BrowserFactory,
        async (page) => {
          return await executeCommand(cmd, args as CommandArgs, false);
        },
        { workspace: `mcp:${cmd.site}` },
      );
    } else {
      result = await executeCommand(cmd, args as CommandArgs, false);
    }

    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: toMcpError(err) };
  }
}
