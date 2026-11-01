import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeHex,
  validateAndNormalizePalette,
  CURATED_PALETTES,
} from '../src/server/colourStudio.js';

test('normalizeHex handles 3-digit, 6-digit, uppercase and invalid hex values', () => {
  assert.equal(normalizeHex('#fff'), '#FFFFFF');
  assert.equal(normalizeHex('#7A1F2B'), '#7A1F2B');
  assert.equal(normalizeHex('7a1f2b'), '#7A1F2B');
  assert.equal(normalizeHex('#abc'), '#AABBCC');
  assert.equal(normalizeHex('invalid'), '#7A1F2B'); // Fallback default
  assert.equal(normalizeHex(''), '#7A1F2B');
});

test('validateAndNormalizePalette formats raw palette into strict 5-colour structure', () => {
  const rawInput = {
    name: 'Marigold Celebration',
    description: 'Festive Indian wedding palette',
    colours: [
      { name: 'Marigold Gold', hex: '#f59e0b', description: 'Primary floral colour', application: 'Garlands' },
      { name: 'Royal Burgundy', hex: '#7a1f2b', description: 'Ceremonial backdrop', application: 'Drapes' },
      { name: 'Warm Cream', hex: '#fff', description: 'Base linens', application: 'Table covers' },
      { name: 'Terracotta', hex: 'e06d53', description: 'Pottery accents', application: 'Clay pots' },
      { name: 'Forest Green', hex: '#1b4332', description: 'Foliage and leaves', application: 'Foliage' },
    ],
    suggestedApplications: {
      decorations: 'Drapes and entrance arches',
      flowers: 'Fresh marigold garlands',
      invitations: 'Cream card with burgundy foil',
      tableSettings: 'Terracotta charger plates',
      otherElements: 'Welcome sign in gold',
    },
  };

  const validated = validateAndNormalizePalette(rawInput);
  assert.ok(validated, 'Should return a valid palette');
  assert.equal(validated.name, 'Marigold Celebration');
  assert.equal(validated.colours.length, 5, 'Must contain exactly 5 colours');
  assert.equal(validated.colours[0].hex, '#F59E0B');
  assert.equal(validated.colours[1].hex, '#7A1F2B');
  assert.equal(validated.colours[2].hex, '#FFFFFF');
  assert.equal(validated.colours[3].hex, '#E06D53');
  assert.equal(validated.colours[4].hex, '#1B4332');

  assert.equal(validated.suggestedApplications?.flowers, 'Fresh marigold garlands');
});

test('validateAndNormalizePalette pads with regional defaults if fewer than 5 colours provided', () => {
  const partialInput = {
    name: 'Incomplete Palette',
    description: 'Only two colours provided',
    colours: [
      { name: 'Crimson', hex: '#990000', description: 'Primary red', application: 'Drapery' },
      { name: 'Ivory', hex: '#FFFFF0', description: 'Soft cream', application: 'Linens' },
    ],
  };

  const validated = validateAndNormalizePalette(partialInput);
  assert.equal(validated.colours.length, 5, 'Must pad up to 5 colours');
  assert.equal(validated.colours[0].hex, '#990000');
  assert.equal(validated.colours[1].hex, '#FFFFF0');
  // Remaining colours padded from CURATED_PALETTES
  assert.ok(validated.colours[2].hex.startsWith('#'));
  assert.ok(validated.colours[3].hex.startsWith('#'));
  assert.ok(validated.colours[4].hex.startsWith('#'));
});

test('CURATED_PALETTES all contain 5 valid colours and suggested applications', () => {
  assert.ok(CURATED_PALETTES.length >= 5, 'At least 5 curated fallback palettes exist');

  for (const pal of CURATED_PALETTES) {
    assert.ok(pal.name && pal.name.length > 0, 'Palette must have a name');
    assert.equal(pal.colours.length, 5, `Palette ${pal.name} must have 5 colours`);
    for (const c of pal.colours) {
      assert.match(c.hex, /^#[0-9A-F]{6}$/i, `${c.name} hex code must be valid #RRGGBB`);
      assert.ok(c.name, 'Colour must have a name');
      assert.ok(c.application, 'Colour must have an application');
    }
    assert.ok(pal.suggestedApplications?.decorations, 'Must have decoration suggestions');
    assert.ok(pal.suggestedApplications?.flowers, 'Must have flower suggestions');
    assert.ok(pal.suggestedApplications?.invitations, 'Must have invitation suggestions');
    assert.ok(pal.suggestedApplications?.tableSettings, 'Must have table setting suggestions');
  }
});
