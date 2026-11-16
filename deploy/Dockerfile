# EDISON — Production Multi-Stage Container Image (Node 22 + Real FFmpeg + Non-Root)
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json ./
RUN npm install --ignore-scripts

COPY tsconfig.json vite.config.ts index.html metadata.json server.ts ./
COPY src ./src
COPY migrations ./migrations
COPY deploy ./deploy
COPY docs ./docs
COPY *.md ./

RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV FFMPEG_BIN=/usr/bin/ffmpeg
ENV FFPROBE_BIN=/usr/bin/ffprobe

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/deploy ./deploy
COPY --from=builder /app/docs ./docs
COPY --from=builder /app/*.md ./

RUN mkdir -p /app/data /app/public/uploads /app/public/rendered \
  && chown -R node:node /app

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

CMD ["npx", "tsx", "server.ts"]
