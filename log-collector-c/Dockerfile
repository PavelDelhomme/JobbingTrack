FROM alpine:latest AS stage-0

# Build dependencies
RUN apk add --no-cache \
    gcc \
    g++ \
    make \
    postgresql-dev \
    linux-headers \
    musl-dev

WORKDIR /app

COPY src/ ./src/
COPY include/ ./include/
COPY Makefile ./

RUN make clean && make

# Runtime minimal
FROM alpine:latest AS stage-1

RUN apk add --no-cache libpq curl

WORKDIR /app

COPY --from=0 /app/bin/log-collector-c ./

# Volume pour accéder aux logs Docker
VOLUME ["/var/lib/docker/containers", "/var/run/docker.sock"]

CMD ["./log-collector-c", "5099"]

