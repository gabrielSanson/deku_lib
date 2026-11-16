// Runs before every integration test file: the tests act as the default shop through its
// restricted connection (role app_server + row-level security), as a hosted shop would.
// A second shop with its own menu exists (setup.ts), so a missing shop filter shows up as a failure.
import { DEFAULT_SHOP_ID, setProcessShop } from '#lib/server/db.ts';

setProcessShop(DEFAULT_SHOP_ID, { forceScoped: true });
