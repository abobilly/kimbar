import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runScreenshotPipeline } from '../../../scripts/screenshot-agent.mjs';

describe('Screenshot Agent', () => {
  const mockTargets = ['test-img-1.png', 'test-img-2.png'];
  const mockRunner = vi.fn();
  const mockFs = {
    unlinkSync: vi.fn(),
    existsSync: vi.fn(),
    statSync: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should invalidate cache (delete existing files)', () => {
    // Setup: Files exist
    mockFs.existsSync.mockReturnValue(true);
    mockRunner.mockReturnValue({ status: 0 });
    mockFs.statSync.mockReturnValue({ mtimeMs: Date.now() + 1000, size: 100 });

    runScreenshotPipeline(mockTargets, mockRunner, mockFs);

    expect(mockFs.unlinkSync).toHaveBeenCalledTimes(2);
    expect(mockFs.unlinkSync).toHaveBeenCalledWith('test-img-1.png');
    expect(mockFs.unlinkSync).toHaveBeenCalledWith('test-img-2.png');
  });

  it('should fail if tests fail and artifacts are missing', () => {
    // Setup: Files deleted, tests fail, files not recreated
    mockFs.existsSync.mockImplementation((path) => {
        // Initial check returns true (to trigger delete), subsequent checks return false
        return false; 
    });
    mockRunner.mockReturnValue({ status: 1 });

    const result = runScreenshotPipeline(mockTargets, mockRunner, mockFs);

    expect(result.success).toBe(false);
  });

  it('should succeed if tests pass and new artifacts are verified', () => {
    // Setup: Files exist, tests pass, stats show new files
    mockFs.existsSync.mockReturnValue(true);
    mockRunner.mockReturnValue({ status: 0 });
    const futureTime = Date.now() + 5000;
    mockFs.statSync.mockReturnValue({ mtimeMs: futureTime, size: 1024 });

    const result = runScreenshotPipeline(mockTargets, mockRunner, mockFs);

    expect(result.success).toBe(true);
    expect(mockFs.statSync).toHaveBeenCalledTimes(2);
  });
});
