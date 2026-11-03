import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newlyDue } from './sounds.ts'

// The rule both alerts use: ring once per order id, never twice, and never miss one.

test('rings for orders it has not rung for', () => {
  const { fresh, next } = newlyDue(['a', 'b'], new Set(['a']))
  assert.deepEqual(fresh, ['b'])
  assert.deepEqual([...next].sort(), ['a', 'b'])
})

test('a reload or reconnect with the same orders rings nothing', () => {
  const rang = new Set(['a', 'b'])
  const { fresh, next } = newlyDue(['a', 'b'], rang)
  assert.deepEqual(fresh, [])
  assert.equal(next, rang)
})

test('one order arriving as another leaves still rings (a count would stay the same)', () => {
  // Before: a was pending. Now: a was confirmed (left the list) and c arrived
  const { fresh } = newlyDue(['c'], new Set(['a']))
  assert.deepEqual(fresh, ['c'])
})

test('several orders at once ring once, and all are remembered', () => {
  const { fresh, next } = newlyDue(['x', 'y', 'z'], new Set())
  assert.deepEqual(fresh, ['x', 'y', 'z'])
  assert.equal(next.size, 3)
})
