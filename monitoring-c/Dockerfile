FROM alpine:latest

# Installer dépendances de compilation
RUN apk add --no-cache \
    gcc \
    g++ \
    make \
    libpq-dev \
    curl-dev \
    linux-headers \
    musl-dev

WORKDIR /app

# Copier les sources
COPY src/ ./src/
COPY include/ ./include/
COPY Makefile ./

# Compiler
RUN make clean && make

# Runtime minimal
FROM alpine:latest
RUN apk add --no-cache libpq curl
WORKDIR /app
COPY --from=0 /app/bin/monitoring-c ./

CMD ["./monitoring-c", "15"]

