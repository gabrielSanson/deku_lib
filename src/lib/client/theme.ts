// Light or dark. Dark is the default; app.html sets data-theme before first paint.
// The choice is kept on this device only.

export function isDark(): boolean {
	return document.documentElement.dataset.theme !== 'light';
}

export function setDark(dark: boolean) {
	document.documentElement.dataset.theme = dark ? 'dark' : 'light';
	try {
		localStorage.setItem('theme', dark ? 'dark' : 'light');
	} catch {
		/* private mode: the choice lasts until the page closes */
	}
}
