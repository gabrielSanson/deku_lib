# One image for both processes:
#   web:    node build                       (default)
#   worker: node --import tsx scripts/worker.ts
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
ARG ORIGIN=
ARG PUBLIC_SUPABASE_URL=
ENV ORIGIN=$ORIGIN PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL
COPY . .
RUN pnpm build && pnpm prune --prod

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/src/lib ./src/lib
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/db ./db
COPY --from=build /app/supabase/migrations ./supabase/migrations
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "build"]
