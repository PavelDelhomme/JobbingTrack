FROM alpine:latest

# Installer dépendances de compilation
RUN apk add --no-cache \
    gcc \
    g++ \
    make \
    postgresql-dev \
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
RUN apk add --no-cache libpq curl docker-cli
WORKDIR /app
COPY --from=0 /app/bin/monitoring-c ./

# Volume pour accéder à Docker socket
VOLUME ["/var/run/docker.sock"]

CMD ["./monitoring-c", "15"]

