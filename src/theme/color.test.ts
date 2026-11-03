import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hexToRgb, rgbToHex, mixHex, contrastRatio } from './color.ts'

test('hexToRgb parses short and long hex', () => {
  assert.deepEqual(hexToRgb('#fff'), [255, 255, 255])
  assert.deepEqual(hexToRgb('#9A5A0E'), [154, 90, 14])
})

test('rgbToHex writes lowercase #rrggbb', () => {
  assert.equal(rgbToHex([154, 90, 14]), '#9a5a0e')
})

test('mixHex blends per channel, rounding half up', () => {
  assert.equal(mixHex('#000000', '#ffffff', 0.5), '#808080')
  assert.equal(mixHex('#9A5A0E', '#ffffff', 1), '#9a5a0e')
})

test('contrastRatio follows WCAG 2.x', () => {
  assert.ok(Math.abs(contrastRatio('#000000', '#ffffff') - 21) <= 0.01)
  assert.ok(contrastRatio('#1F1A17', '#FAF7F2') > 15)
})

test('contrastRatio is symmetric', () => {
  const a = '#9A5A0E'
  const b = '#FAF7F2'
  assert.equal(contrastRatio(a, b), contrastRatio(b, a))
})
