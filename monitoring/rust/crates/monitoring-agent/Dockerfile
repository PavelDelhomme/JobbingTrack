FROM rust:alpine AS builder

RUN apk add --no-cache musl-dev
WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY crates ./crates

RUN cargo build --release -p jobbingtrack-monitoring-agent

FROM alpine:latest

RUN apk add --no-cache curl
WORKDIR /app

COPY --from=builder /app/target/release/monitoring-agent ./

EXPOSE 8015
CMD ["./monitoring-agent"]
