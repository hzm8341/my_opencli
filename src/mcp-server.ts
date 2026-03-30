/**
 * OpenCLI MCP Server
 *
 * Starts an MCP server that exposes all opencli commands as tools.
 * Use via: opencli mcp
 */

import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { getRegistry } from './registry.js';
import { discoverClis, discoverPlugins } from './discovery.js';
import { getAllTools, executeTool } from './mcp/index.js';
import { PKG_VERSION } from './version.js';

// Discover commands before starting the server
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILTIN_CLIS = path.resolve(__dirname, 'clis');
const USER_CLIS = path.join(os.homedir(), '.opencli', 'clis');

await discoverClis(BUILTIN_CLIS, USER_CLIS);
await discoverPlugins();

const server = new Server(
  {
    name: 'opencli',
    version: PKG_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// ── Handlers ─────────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: getAllTools() };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  // Validate command exists
  const cmd = getRegistry().get(name);
  if (!cmd) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: Command not found: ${name}\n\nAvailable commands: ${[...getRegistry().keys()].join(', ')}`,
        },
      ],
      isError: true,
    };
  }

  const result = await executeTool(cmd, args);

  if (!result.success && result.error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error [${result.error.code}]: ${result.error.message}`,
        },
      ],
      isError: true,
    };
  }

  // Format result for MCP response
  const formatted = formatResult(result.data, cmd.columns);
  return {
    content: [
      {
        type: 'text',
        text: formatted,
      },
    ],
  };
});

// ── Output Formatting ─────────────────────────────────────────────────────────

function formatResult(data: unknown, columns?: string[]): string {
  if (data === null || data === undefined) {
    return '(empty result)';
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return '(empty result)';

    if (columns) {
      return renderTable(data, columns);
    }
    return JSON.stringify(data, null, 2);
  }

  if (typeof data === 'object') {
    return JSON.stringify(data, null, 2);
  }

  return String(data);
}

function renderTable(rows: unknown[], columns: string[]): string {
  const header = columns.join(' | ');
  const separator = columns.map(() => '---').join(' | ');

  const lines = rows.map((row) => {
    const obj = row as Record<string, unknown>;
    return columns.map((col) => String(obj[col] ?? '')).join(' | ');
  });

  return [header, separator, ...lines].join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

export async function startMcpServer(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Start when run directly
startMcpServer().catch((err) => {
  console.error('Failed to start MCP server:', err);
  process.exit(1);
});
