import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ImageUploadGuide, type ImagePurpose } from '../components/content/ImageUploadGuide';

describe('image upload guidance', () => {
  it.each([
    ['profile', '1280 × 720', '2 MB'],
    ['official', '800 × 800', '2 MB'],
    ['mosque', '1200 × 900', '2 MB'],
    ['banner', '1200 × 800', '2 MB'],
    ['gallery', '1200 × 900', '5 MB'],
  ])('shows dimensions, formats and the actual limit for %s', (purpose, size, limit) => {
    render(<ImageUploadGuide purpose={purpose as ImagePurpose} />);
    const guide = screen.getByText(/Format JPG, PNG, atau WebP/);
    expect(guide).toHaveTextContent(size);
    expect(guide).toHaveTextContent(limit);
  });
});
