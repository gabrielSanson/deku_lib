// Estoque → Fichas técnicas: the cost of each product and add-on, and the margin per channel.
import { recipeOverview } from '#lib/server/stock/service.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => recipeOverview();
