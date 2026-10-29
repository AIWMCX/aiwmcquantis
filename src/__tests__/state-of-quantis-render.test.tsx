import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import StateOfQuantis from '@/pages/StateOfQuantis';

// Live 2026-10-28: "Each report also runs1,000 modeled months". A JSX line
// break before {expression} drops the space; this checks the rendered text.
describe('State of Quantis renders readable text', () => {
  it('has a space before the iteration count', () => {
    const { container } = render(
      <HelmetProvider><MemoryRouter><StateOfQuantis /></MemoryRouter></HelmetProvider>,
    );
    const text = container.textContent ?? '';
    expect(text).toMatch(/also runs 1,000 modeled months/);
    expect(text).not.toMatch(/[a-z][0-9],\d{3} modeled/);
  });
});
