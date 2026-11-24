FROM golang:1.26.8-bookworm AS go-toolchain

FROM node:24-bookworm AS build
COPY --from=go-toolchain /usr/local/go /usr/local/go
ENV PATH="/usr/local/go/bin:${PATH}"
ENV CGO_ENABLED=0

WORKDIR /app
RUN go version && node --version && npm --version
COPY . .
RUN npm run build

FROM debian:bookworm-slim AS runtime
WORKDIR /app
COPY --from=build /app/server-bin ./server-bin
COPY --from=build /app/frontend/dist ./dist
EXPOSE 10000
CMD ["./server-bin"]
