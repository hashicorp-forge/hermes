# syntax=docker/dockerfile:1.4
# do not forget to set env on host: `export DOCKER_BUILDKIT=1`
FROM ubuntu:22.04 as frontend-builder
# Build frontend using NodeJS 16.x
WORKDIR /app
RUN apt-get update

RUN apt-get -y install curl make gcc
RUN curl -sL https://deb.nodesource.com/setup_16.x  | bash -
RUN apt-get -y install nodejs

RUN corepack enable
RUN corepack prepare yarn@stable --activate
RUN yarn set version stable

COPY --link . .

RUN make web/install-deps
RUN make web/build


FROM ubuntu:22.04 as backend-builder
# Build backend using golang

WORKDIR /app
RUN apt-get update
RUN apt-get -y install golang-1.18 golang-go ca-certificates make git

COPY --link go.mod go.sum ./

# update trusted certificates to the latest version
RUN update-ca-certificates
RUN go mod download

COPY --link . .
COPY --link --from=frontend-builder /app/web/dist /app/web/dist
RUN make bin


FROM ubuntu:22.04 as hermes
# Copy frontend and backend files from previous build stages and set ENTRYPOINT

WORKDIR /app
COPY --from=backend-builder /app/hermes hermes
RUN chmod +x hermes

ENTRYPOINT ["./hermes"]
