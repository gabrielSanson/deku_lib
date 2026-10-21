// Home hero motion: the photo and the copy come in once, then the background and
// the burger drift at different speeds while the hero scrolls away (parallax).
// GSAP loads only on the home page, and nothing moves for prefers-reduced-motion.
import type { Attachment } from 'svelte/attachments';

export const heroMotion: Attachment<HTMLElement> = (hero) => {
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
	if (reduce.matches) return;
	let revert: (() => void) | undefined;
	let gone = false;

	Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
		([{ gsap }, { ScrollTrigger }]) => {
			if (gone) return;
			gsap.registerPlugin(ScrollTrigger);
			const q = gsap.utils.selector(hero);
			const ctx = gsap.context(() => {
				gsap
					.timeline({ defaults: { ease: 'power3.out' } })
					.from(q('[data-hero-bg]'), { scale: 1.12, autoAlpha: 0, duration: 1.4 })
					.from(q('[data-hero-burger]'), { y: 80, scale: 0.9, autoAlpha: 0, duration: 1 }, 0.25)
					.from(q('[data-hero-in]'), { y: 24, autoAlpha: 0, duration: 0.7, stagger: 0.08 }, 0.35);

				const scroll = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
				gsap.to(q('[data-hero-bg]'), { yPercent: 18, ease: 'none', scrollTrigger: scroll });
				gsap.to(q('[data-hero-burger]'), { yPercent: -12, ease: 'none', scrollTrigger: scroll });
			}, hero);
			revert = () => ctx.revert();
		},
		// Motion is a nice-to-have: if the chunk fails to load, the hero just stays still.
		() => {}
	);

	// Someone switching reduced motion on mid-visit gets a still hero right away.
	const stop = () => reduce.matches && revert?.();
	reduce.addEventListener('change', stop);
	return () => {
		gone = true;
		reduce.removeEventListener('change', stop);
		revert?.();
	};
};
