#!/usr/bin/env node
/**
 * MCP Gates Server - Kimbar verification gates
 * 
 * Tools:
 * - kimbar.check: run `npm run check` (full gate)
 * - kimbar.checkFast: run `npm run check:fast` (unit tests only)
 * - kimbar.verify: run `npm run verify` (invariant checks)
 * - kimbar.prepare: run `npm run prepare:content` (content pipeline)
 * - kimbar.test: run `npm run test:unit` (unit tests)
 * - kimbar.build: run `npm run build` (production build)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import * as path from 'path';

// Get workspace root (assume server runs from tools/mcp-gates)
const WORKSPACE_ROOT = process.env.KIMBAR_ROOT || path.resolve(process.cwd(), '../..');

// Execute npm script and return output
async function runNpmScript(script: string, timeout = 300000): Promise<{ success: boolean; output: string; exitCode: number | null }> {
    return new Promise((resolve) => {
        const chunks: string[] = [];
        const proc = spawn('npm', ['run', script], {
            cwd: WORKSPACE_ROOT,
            shell: true,
            env: { ...process.env, FORCE_COLOR: '0' },
        });

        const timer = setTimeout(() => {
            proc.kill('SIGTERM');
            resolve({
                success: false,
                output: chunks.join('') + '\n\n[TIMEOUT: command exceeded ' + (timeout / 1000) + 's]',
                exitCode: null,
            });
        }, timeout);

        proc.stdout.on('data', (data) => chunks.push(data.toString()));
        proc.stderr.on('data', (data) => chunks.push(data.toString()));

        proc.on('close', (code) => {
            clearTimeout(timer);
            resolve({
                success: code === 0,
                output: chunks.join(''),
                exitCode: code,
            });
        });

        proc.on('error', (err) => {
            clearTimeout(timer);
            resolve({
                success: false,
                output: `Spawn error: ${err.message}`,
                exitCode: null,
            });
        });
    });
}

// Gate definitions
const GATES: Record<string, { script: string; description: string; timeout?: number }> = {
    'kimbar.check': {
        script: 'check',
        description: 'Full gate (content + verify + tests + build)',
        timeout: 600000, // 10 min
    },
    'kimbar.checkFast': {
        script: 'check:fast',
        description: 'Quick gate (unit tests only)',
        timeout: 120000, // 2 min
    },
    'kimbar.verify': {
        script: 'verify',
        description: 'Invariant verification',
        timeout: 60000, // 1 min
    },
    'kimbar.prepare': {
        script: 'prepare:content',
        description: 'Content pipeline (sprites, ink, registry)',
        timeout: 300000, // 5 min
    },
    'kimbar.test': {
        script: 'test:unit',
        description: 'Unit tests',
        timeout: 120000, // 2 min
    },
    'kimbar.build': {
        script: 'build',
        description: 'Production build',
        timeout: 180000, // 3 min
    },
};

// MCP Server
const server = new Server(
    { name: 'kimbar-gates', version: '0.1.0' },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: Object.entries(GATES).map(([name, gate]) => ({
        name,
        description: gate.description,
        inputSchema: { type: 'object', properties: {} },
    })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name } = request.params;
    const gate = GATES[name];

    if (!gate) {
        return {
            content: [{ type: 'text', text: `Unknown gate: ${name}` }],
            isError: true,
        };
    }

    const result = await runNpmScript(gate.script, gate.timeout);

    // Format output
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const output = [
        `# ${gate.description}`,
        `**Status:** ${status}`,
        `**Exit Code:** ${result.exitCode}`,
        '',
        '## Output',
        '```',
        result.output.slice(-10000), // Last 10KB
        '```',
    ].join('\n');

    return {
        content: [{ type: 'text', text: output }],
        isError: !result.success,
    };
});

// Start server
const transport = new StdioServerTransport();
server.connect(transport);
