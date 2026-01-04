#!/bin/bash

# EC2 Setup Script for CollabX
# Run this script on your Ubuntu EC2 instance to install necessary dependencies.

set -e

echo "🚀 Starting System Setup..."

# 1. Update System
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# 2. Install Git
if ! command -v git &> /dev/null; then
    echo "📦 Installing Git..."
    sudo apt-get install -y git
else
    echo "✅ Git is already installed"
fi

# 3. Install Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    # Add Docker's official GPG key:
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    # Add the repository to Apt sources:
    echo \
      "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Add current user to docker group (avoids needing sudo for docker commands)
    sudo usermod -aG docker $USER
    echo "✅ Docker installed successfully."
    echo "⚠️  NOTE: You may need to log out and log back in for docker group changes to take effect."
else
    echo "✅ Docker is already installed"
fi

# 4. Check Docker Compose
if docker compose version &> /dev/null; then
    echo "✅ Docker Compose is available"
else
    echo "❌ Docker Compose not found (should have been installed with docker-compose-plugin)"
fi

echo "🎉 Setup Complete!"
echo "--------------------------------------------------------"
echo "Next Steps:"
echo "1. Clone your repository (if not already done)"
echo "   git clone https://github.com/SampathKumar1438/collabx.git"
echo "   cd collabx"
echo "2. Create .env file for production"
echo "   cp .env.example .env"
echo "   nano .env (Update VITE_API_URL and MINIO_EXTERNAL_ENDPOINT with your EC2 Public IP)"
echo "3. Start the application"
echo "   docker compose up -d --build"
echo "--------------------------------------------------------"
