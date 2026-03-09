FROM node:18-alpine AS frontend-build

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


FROM node:18-alpine AS backend

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/src ./src
COPY backend/scripts ./scripts
COPY backend/data ./data

RUN mkdir -p /app/public
COPY --from=frontend-build /frontend/dist/ /app/public/

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
