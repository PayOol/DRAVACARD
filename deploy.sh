#!/bin/bash

# Script de déploiement pour DRAVACARD sur VPS
# Usage: ./deploy.sh

set -e

echo "🚀 Déploiement de DRAVACARD sur VPS..."

# Variables
VPS_IP="72.61.194.1"
VPS_USER="root"  # Modifier si nécessaire
APP_DIR="/opt/dravacard"
REPO_URL="git@github.com:PayOol/DRAVACARD.git"

# Couleurs pour les logs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Connexion au VPS ${VPS_IP}...${NC}"

# Commandes à exécuter sur le VPS
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
set -e

APP_DIR="/opt/dravacard"

echo "🔍 Vérification de Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Installation..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl start docker
    systemctl enable docker
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Installation..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

echo "✅ Docker et Docker Compose sont installés"

# Créer le répertoire si nécessaire
mkdir -p ${APP_DIR}
cd ${APP_DIR}

echo "📥 Mise à jour du code..."
# Si vous utilisez Git
# git pull origin main

echo "🛑 Arrêt des conteneurs existants..."
docker-compose down || true

echo "🏗️  Construction de l'image Docker..."
docker-compose build --no-cache

echo "🚀 Démarrage des conteneurs..."
docker-compose up -d

echo "🧹 Nettoyage des images inutilisées..."
docker system prune -f

echo "✅ Déploiement terminé!"
echo "📊 Statut des conteneurs:"
docker-compose ps

ENDSSH

echo -e "${GREEN}✅ Déploiement réussi!${NC}"
echo -e "${BLUE}🌐 L'application est accessible sur: http://${VPS_IP}:3000${NC}"
echo ""
echo "📋 Commandes utiles:"
echo "  - Voir les logs: ssh ${VPS_USER}@${VPS_IP} 'cd ${APP_DIR} && docker-compose logs -f'"
echo "  - Redémarrer: ssh ${VPS_USER}@${VPS_IP} 'cd ${APP_DIR} && docker-compose restart'"
echo "  - Arrêter: ssh ${VPS_USER}@${VPS_IP} 'cd ${APP_DIR} && docker-compose down'"
