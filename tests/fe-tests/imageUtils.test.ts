import { describe, it, expect } from 'vitest';
import { fileToCompressedDataUrl } from './imageUtils';

describe('fileToCompressedDataUrl', () => {
  it('rejects a file that is not an image', async () => {
    const file = new File(['not an image'], 'note.txt', { type: 'text/plain' });
    await expect(fileToCompressedDataUrl(file)).rejects.toThrow();
  });
});
