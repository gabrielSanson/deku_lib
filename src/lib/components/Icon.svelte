<script lang="ts" module>
	// Line icons on a 24px grid, drawn with currentColor so they follow the text.
	const paths = {
		burger: [
			'M4 11c0-3.9 3.6-7 8-7s8 3.1 8 7H4z',
			'M3 14.5h18',
			'M5 17.5h14c0 1.4-1.1 2.5-2.5 2.5h-9C6.1 20 5 18.9 5 17.5z'
		],
		fries: ['M6 10h12l-1.6 10H7.6z', 'M8.5 10V4.5', 'M11.5 10V3.5', 'M14.5 10V4.5'],
		drink: ['M6 7h12', 'M7 7l1.2 13h7.6L17 7', 'M12.5 7l1.5-4h3'],
		combo: ['M3 8l9-4 9 4-9 4z', 'M3 12l9 4 9-4', 'M3 16l9 4 9-4'],
		dessert: ['M7.5 10a4.5 4.5 0 1 1 9 0z', 'M7.5 10L12 21l4.5-11'],
		crown: ['M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z'],
		grid: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
		cart: ['M3 4h2l2.4 11h10.2L20 7H6.2', 'M9 20h.01', 'M17 20h.01'],
		trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
		plus: ['M12 5v14', 'M5 12h14'],
		minus: ['M5 12h14'],
		close: ['M6 6l12 12', 'M18 6L6 18'],
		arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
		back: ['M19 12H5', 'M11 6l-6 6 6 6'],
		truck: ['M2 6h11v10H2z', 'M13 9h4l4 4v3h-8', 'M6 19a2 2 0 1 0 0-.01', 'M17 19a2 2 0 1 0 0-.01'],
		pix: [
			'M12 2.5l4 4-4 4-4-4z',
			'M12 13.5l4 4-4 4-4-4z',
			'M2.5 12l4-4 4 4-4 4z',
			'M13.5 12l4-4 4 4-4 4z'
		],
		lock: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4', 'M12 15v2'],
		pin: ['M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z', 'M12 12a2.5 2.5 0 1 0 0-.01'],
		receipt: ['M6 3h12v18l-3-2-3 2-3-2-3 2z', 'M9 8h6', 'M9 12h6'],
		clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
		check: ['M5 12.5l4.5 4.5L19 7.5'],
		home: ['M4 11l8-7 8 7', 'M6 9.5V20h12V9.5', 'M10 20v-5h4v5'],
		list: ['M9 6h11', 'M9 12h11', 'M9 18h11', 'M4.5 6h.01', 'M4.5 12h.01', 'M4.5 18h.01'],
		chart: ['M4 20V4', 'M4 20h16', 'M8 16v-4', 'M12 16V8', 'M16 16v-6'],
		cash: [
			'M3 7h18v10H3z',
			'M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
			'M6 10v.01',
			'M18 14v.01'
		],
		users: [
			'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
			'M2.5 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5',
			'M16 4.5a3.5 3.5 0 0 1 0 6.5',
			'M18 14.8c2 .7 3.2 2.5 3.5 5.2'
		],
		store: [
			'M3 9l1.5-5h15L21 9',
			'M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z',
			'M5 13v7h14v-7'
		],
		settings: [
			'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
			'M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.3 3h-4l-.4 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.7h4l.4-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z'
		],
		book: ['M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z', 'M4 21a2 2 0 0 1 2-2h13v2', 'M8 7h7'],
		chef: ['M7 14a4 4 0 1 1 1.5-7.7A4 4 0 0 1 16 6.5 4 4 0 1 1 17 14', 'M7 14v6h10v-6', 'M7 17h10'],
		menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
		logout: ['M10 4H5v16h5', 'M15 8l4 4-4 4', 'M19 12H9'],
		search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-4-4'],
		bag: ['M5 8h14l-1 12H6z', 'M9 8V6a3 3 0 0 1 6 0v2']
	} as const;
	export type IconName = keyof typeof paths;
</script>

<script lang="ts">
	let {
		name,
		class: className = 'size-5',
		strokeWidth = 2
	}: { name: IconName; class?: string; strokeWidth?: number } = $props();
</script>

<svg
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	class={className}
	aria-hidden="true"
>
	{#each paths[name] as d (d)}<path {d} />{/each}
</svg>
