# ──────────────────────────────────────────────────────────────────────────────
# Multi-stage Native AOT Dockerfile for .NET 10 API
# Output: ~15MB self-contained binary (no runtime dependencies)
# ──────────────────────────────────────────────────────────────────────────────

FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
WORKDIR /src

# Copy project files
COPY ["src/HybridPlatform.Api/HybridPlatform.Api.csproj", "HybridPlatform.Api/"]
COPY ["src/HybridPlatform.Core/HybridPlatform.Core.csproj", "HybridPlatform.Core/"]

# Restore dependencies
RUN dotnet restore "HybridPlatform.Api/HybridPlatform.Api.csproj"

# Copy source code
COPY src/HybridPlatform.Api/ HybridPlatform.Api/
COPY src/HybridPlatform.Core/ HybridPlatform.Core/

# Build and publish Native AOT binary
WORKDIR "/src/HybridPlatform.Api"
RUN dotnet publish \
    -c Release \
    -o /app/publish \
    -r linux-musl-x64 \
    --self-contained true \
    /p:PublishAot=true \
    /p:PublishTrimmed=true \
    /p:StripSymbols=true

# ──────────────────────────────────────────────────────────────────────────────
# Runtime stage: Minimal Alpine Linux (no .NET runtime required)
# ──────────────────────────────────────────────────────────────────────────────

FROM mcr.microsoft.com/dotnet/runtime-deps:10.0-alpine AS final
WORKDIR /app

# Security hardening
RUN apk add --no-cache ca-certificates \
    && addgroup -g 1001 appgroup \
    && adduser -u 1001 -G appgroup -s /bin/sh -D appuser

# Copy published binary
COPY --from=build /app/publish .

# Set ownership and permissions
RUN chown -R appuser:appgroup /app \
    && chmod +x HybridPlatform.Api

# Run as non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

EXPOSE 8080

ENTRYPOINT ["./HybridPlatform.Api"]
