FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server.js ./
COPY lib ./lib
COPY public ./public
# Data (SQLite database + uploaded files) lives in a volume owned by the unprivileged node user.
RUN mkdir -p /app/data && chown node:node /app/data
USER node
ENV DATA_DIR=/app/data PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "server.js"]
