FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .
RUN go build -o /pickky ./cmd/api

FROM alpine:latest
WORKDIR /app
COPY --from=builder /pickky /pickky
EXPOSE 8080
ENTRYPOINT ["/pickky"]
