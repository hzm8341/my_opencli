/**
 * Convert CliCommand to MCP Tool definition.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { type CliCommand, fullName, getRegistry } from '../registry.js';

// JSON Schema property representation
interface JsonSchemaProperty {
  type: string;
  description?: string;
  default?: unknown;
  enum?: string[];
}

/**
 * Convert a single CliCommand to an MCP Tool definition.
 */
export function convertCommandToTool(cmd: CliCommand): Tool {
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];

  for (const arg of cmd.args) {
    if (arg.hidden) continue;

    let type = 'string';
    if (arg.type === 'int' || arg.type === 'number') type = 'number';
    if (arg.type === 'boolean' || arg.type === 'bool') type = 'boolean';

    const prop: JsonSchemaProperty = {
      type,
      description: arg.help,
    };

    if (arg.default !== undefined) prop.default = arg.default;
    if (arg.choices && arg.choices.length > 0) prop.enum = arg.choices;

    properties[arg.name] = prop;

    if (arg.required) required.push(arg.name);
  }

  const name = fullName(cmd);
  const description = cmd.deprecated
    ? `[DEPRECATED] ${cmd.description}${typeof cmd.deprecated === 'string' ? ` ${cmd.deprecated}` : ''}${cmd.replacedBy ? ` Use ${cmd.replacedBy} instead.` : ''}`
    : cmd.description;

  return {
    name,
    description,
    inputSchema: {
      type: 'object',
      properties,
      ...(required.length > 0 && { required }),
    },
  };
}

/**
 * Get all available tools from the command registry.
 */
export function getAllTools(): Tool[] {
  return [...getRegistry().values()].map(convertCommandToTool);
}
