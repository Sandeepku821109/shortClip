import { allowedMimeTypes, allowedExtensions } from '../../backend/src/config';

describe('Upload Validation', () => {
  describe('MIME types', () => {
    it('should include common video formats', () => {
      expect(allowedMimeTypes).toContain('video/mp4');
      expect(allowedMimeTypes).toContain('video/quicktime');
      expect(allowedMimeTypes).toContain('video/webm');
    });

    it('should not include non-video formats', () => {
      expect(allowedMimeTypes).not.toContain('image/jpeg');
      expect(allowedMimeTypes).not.toContain('application/pdf');
    });
  });

  describe('File extensions', () => {
    it('should include common video extensions', () => {
      expect(allowedExtensions).toContain('.mp4');
      expect(allowedExtensions).toContain('.mov');
      expect(allowedExtensions).toContain('.webm');
    });

    it('should not include non-video extensions', () => {
      expect(allowedExtensions).not.toContain('.jpg');
      expect(allowedExtensions).not.toContain('.exe');
    });
  });
});