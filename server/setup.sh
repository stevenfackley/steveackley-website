#!/bin/bash
# =============================================================================
# One-time EC2 server setup script (Amazon Linux 2023)
# Run this ONCE after launching the EC2 instance.
# After this script, the server is ready to receive deployments from CI/CD.
#
# Usage:
#   ssh ec2-user@<your-ec2-ip>
#   curl -fsSL https://raw.githubusercontent.com/stevenfackley/steveackley-website/main/server/setup.sh | bash
# =============================================================================
set -e

echo "==> [1/5] Installing git and Docker..."
sudo yum install -y git docker

echo "==> [2/5] Starting and enabling Docker..."
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"

echo "==> [3/5] Installing Docker Compose plugin..."
DOCKER_CONFIG="${DOCKER_CONFIG:-$HOME/.docker}"
mkdir -p "$DOCKER_CONFIG/cli-plugins"
curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
  -o "$DOCKER_CONFIG/cli-plugins/docker-compose"
chmod +x "$DOCKER_CONFIG/cli-plugins/docker-compose"

echo "==> [4/5] Cloning server config (Caddyfile + Caddy compose)..."
if [ ! -d "$HOME/server" ]; then
  git clone --no-checkout --depth=1 https://github.com/stevenfackley/steveackley-website.git /tmp/steveackley-init
  cd /tmp/steveackley-init
  git sparse-checkout init --cone
  git sparse-checkout set server
  git checkout
  cp -r server "$HOME/server"
  cd "$HOME" && rm -rf /tmp/steveackley-init
else
  echo "  ~/server already exists, skipping clone."
fi

echo "==> [5/5] Starting Caddy (reverse proxy + web network)..."
cd "$HOME/server"
# Use sudo docker until the user re-logs in and the docker group is active
sudo docker compose up -d

echo ""
echo "======================================================="
echo "  Server setup complete!"
echo "======================================================="
echo ""
echo "NEXT STEPS:"
echo "  1. Log out and back in so 'docker' works without sudo."
echo "  2. Open ports 80 and 443 in the EC2 Security Group."
echo "  3. Each app repo's CI/CD will handle its own deployment."
echo ""
echo "TO ADD A NEW SITE:"
echo "  - Edit ~/server/Caddyfile to add the domain/upstream"
echo "  - Run: cd ~/server && docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile"
echo ""
