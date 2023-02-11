FROM gcr.io/distroless/base-debian11

WORKDIR /app

COPY hermes hermes

ENTRYPOINT ["/app/hermes"]
