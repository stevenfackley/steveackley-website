#!/bin/bash
# Fix Cloudflare tunnel configuration

echo "Creating new tunnel config..."
sudo tee /etc/cloudflared/config.yml > /dev/null <<EOF
tunnel: 3663784b-7da3-4749-9687-ede2eec232c6
credentials-file: /home/ec2-user/.cloudflared/3663784b-7da3-4749-9687-ede2eec232c6.json
ingress:
  - hostname: aws.steveackley.org
    service: http://localhost:3000
  - service: http_status:404
EOF

echo "Config updated. Restarting cloudflared..."
sudo systemctl restart cloudflared

echo "Waiting for service to start..."
sleep 3

echo "Checking status..."
sudo systemctl status cloudflared --no-pager -l | head -20

echo ""
echo "Testing connection to localhost:3000..."
curl -I http://localhost:3000 2>&1 | head -5
