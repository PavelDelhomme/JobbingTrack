FROM rust:alpine AS builder

RUN apk add --no-cache musl-dev
WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY crates ./crates

RUN cargo build --release -p jobbingtrack-log-collector

FROM alpine:latest

RUN apk add --no-cache curl
WORKDIR /app

COPY --from=builder /app/target/release/log-collector ./

EXPOSE 3019
CMD ["./log-collector", "3019"]
