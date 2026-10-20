import { describe, expect, it } from 'vitest';
import { canTransition, requiresReason, roleMayTransition } from './order-status';

describe('order state machine', () => {
	it('follows the happy path only forward', () => {
		expect(canTransition('new', 'confirmed')).toBe(true);
		expect(canTransition('confirmed', 'preparing')).toBe(true);
		expect(canTransition('preparing', 'ready')).toBe(true);
		expect(canTransition('ready', 'completed')).toBe(true);
		expect(canTransition('ready', 'preparing')).toBe(false);
		expect(canTransition('new', 'ready')).toBe(false);
		expect(canTransition('completed', 'cancelled')).toBe(false);
	});

	it('only allows rejection from new', () => {
		expect(canTransition('new', 'rejected')).toBe(true);
		expect(canTransition('confirmed', 'rejected')).toBe(false);
	});

	it('limits late cancellation to managers and owners', () => {
		expect(roleMayTransition('cashier', 'confirmed', 'cancelled')).toBe(true);
		expect(roleMayTransition('cashier', 'preparing', 'cancelled')).toBe(false);
		expect(roleMayTransition('manager', 'preparing', 'cancelled')).toBe(true);
		expect(roleMayTransition('kitchen', 'new', 'cancelled')).toBe(false);
	});

	it('lets the kitchen run preparation but not accept orders', () => {
		expect(roleMayTransition('kitchen', 'confirmed', 'preparing')).toBe(true);
		expect(roleMayTransition('kitchen', 'preparing', 'ready')).toBe(true);
		expect(roleMayTransition('kitchen', 'new', 'confirmed')).toBe(false);
	});

	it('requires a reason to cancel or reject', () => {
		expect(requiresReason('cancelled')).toBe(true);
		expect(requiresReason('rejected')).toBe(true);
		expect(requiresReason('ready')).toBe(false);
	});
});
