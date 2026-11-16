// A value cached separately for each shop (the shop of the current work, see db.ts withShop).
import { currentShopId } from './db';

export interface PerShop<T> {
	/** The current shop's value; assigning undefined forgets it. */
	value: T | undefined;
	/** Forget every shop's value. */
	clearAll(): void;
}

export function perShop<T>(): PerShop<T> {
	const values = new Map<string, T>();
	return {
		get value() {
			return values.get(currentShopId());
		},
		set value(v: T | undefined) {
			if (v === undefined) values.delete(currentShopId());
			else values.set(currentShopId(), v);
		},
		clearAll() {
			values.clear();
		}
	};
}
