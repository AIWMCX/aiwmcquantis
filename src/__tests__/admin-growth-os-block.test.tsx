import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GrowthOsBlock } from '@/pages/admin/GrowthOsBlock';
import { hookVerdict, inProduct, type GrowthOsBlock as Block } from '@/lib/growth-os';

const RULES = { ship: 70, fix: 50, textGate: 85, forecast: '170 x 2^((score - 55) / 15) views' };
const OS: Block = {
  channels: [
    { id: 'ig-intacto', platform: 'instagram', handle: '@intacto.b__', language: 'ru', lanes: ['lesson'] },
    { id: 'tg-aiwmcx', platform: 'telegram', handle: 't.me/aiwmcx', language: 'ru' },
    { id: 'ig-wmcai', platform: 'instagram', handle: '@wmc.ai', language: 'en' },
    { id: 'li-aiwmc', platform: 'linkedin', handle: 'AIWMC', language: 'en' },
  ],
  products: {
    quantis: { lanes: ['product'], channels: { en: ['ig-wmcai', 'li-aiwmc'], ru: ['tg-aiwmcx'] }, hooks: 1, queue: 0, videos: 0 },
    store: { lanes: ['web3d'], channels: { en: ['ig-wmcai'], ru: ['ig-intacto'] }, hooks: 1, queue: 0, videos: 1 },
  },
  hooks: [
    { hook: 'Same hire. Change one assumption and the yes becomes a no.', product: 'quantis', channel: 'LinkedIn', score: 88 },
    { hook: 'Guess what this website sells.', product: 'store', channel: 'Reels', score: 62 },
  ],
  videos: [{ id: 'passage_en', lang: 'en', product: 'store', title: 'Passage cut 2', status: 'ready' }],
  rules: RULES,
};

describe('Growth OS block', () => {
  it('grades hooks with the Hook Machine thresholds', () => {
    expect(hookVerdict(88, RULES)).toBe('SHIP');
    expect(hookVerdict(62, RULES)).toBe('FIX');
    expect(hookVerdict(40, RULES)).toBe('KILL');
    expect(hookVerdict(null, RULES)).toBe('');
  });

  it('matches items to products', () => {
    expect(inProduct('store', 'all')).toBe(true);
    expect(inProduct('store', 'quantis')).toBe(false);
    expect(inProduct(undefined, 'general')).toBe(true);
  });

  it('shows every channel with its language for all products', () => {
    render(<GrowthOsBlock os={OS} filter="all" />);
    expect(screen.getByText('@intacto.b__')).toBeInTheDocument();
    expect(screen.getByText('t.me/aiwmcx')).toBeInTheDocument();
    expect(screen.getByText('@wmc.ai')).toBeInTheDocument();
    expect(screen.getByText(/Channels \(4\)/)).toBeInTheDocument();
    expect(screen.getByText('SHIP')).toBeInTheDocument();
  });

  it('narrows to one product: its own EN/RU chain and its hooks only', () => {
    render(<GrowthOsBlock os={OS} filter="quantis" />);
    expect(screen.getByText(/Channels \(3\)/)).toBeInTheDocument();
    expect(screen.queryByText('@intacto.b__')).not.toBeInTheDocument();
    expect(screen.getByText('Same hire. Change one assumption and the yes becomes a no.')).toBeInTheDocument();
    expect(screen.queryByText('Guess what this website sells.')).not.toBeInTheDocument();
  });
});
