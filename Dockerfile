FROM node:20-alpine3.20 AS base
RUN npm install --global pnpm
WORKDIR /app
EXPOSE 8080

FROM base AS develop
CMD pnpm start:develop

FROM base AS builder
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY prisma prisma
RUN pnpx prisma generate
COPY tsconfig.json ./
COPY src src
RUN pnpm build

FROM base AS production
COPY package.json pnpm-lock.yaml  ./
RUN pnpm install --production
COPY prisma prisma
RUN pnpx prisma generate
COPY --from=builder /app/dist dist
CMD pnpm prisma:deploy && pnpm start:production
