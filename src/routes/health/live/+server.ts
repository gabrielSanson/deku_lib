// Liveness: the process is up. No dependencies checked.
export const GET = () => new Response('ok', { headers: { 'cache-control': 'no-store' } });
