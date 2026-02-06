import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

type PackageJson = {
  scripts?: Record<string, string>;
};

function readScripts(): Record<string, string> {
  const packagePath = join(process.cwd(), 'package.json');
  const parsed = JSON.parse(readFileSync(packagePath, 'utf-8')) as PackageJson;
  return parsed.scripts ?? {};
}

describe('content pipeline scripts', () => {
  it('keeps prepare:content free of heavyweight import steps', () => {
    const scripts = readScripts();
    const prepare = scripts['prepare:content'] ?? '';

    expect(prepare).not.toContain('import:lpc');
    expect(prepare).not.toContain('import:scotus');
  });

  it('provides an explicit full sync path for import steps', () => {
    const scripts = readScripts();
    const fullSync = scripts['prepare:content:full'] ?? '';
    const imports = scripts['prepare:content:imports'] ?? '';

    expect(fullSync).toContain('prepare:content:imports');
    expect(imports).toContain('import:lpc');
    expect(imports).toContain('import:scotus');
  });
});
