#!/bin/bash

# Script automatisé pour configurer le domaine drava.payool.net
# Usage: ./setup-domain.sh

set -e

DOMAIN="drava.payool.net"
VPS_IP="72.61.194.1"
VPS_USER="root"

echo "🌐 Configuration du domaine ${DOMAIN} sur le VPS ${VPS_IP}..."

# Connexion au VPS et exécution des commandes
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
set -e

DOMAIN="drava.payool.net"

echo "📦 Vérification de Nginx..."
if ! command -v nginx &> /dev/null; then
    echo "🔧 Installation de Nginx..."
    apt update
    apt install nginx -y
    systemctl start nginx
    systemctl enable nginx
fi

echo "✅ Nginx est installé"

echo "📝 Création de la configuration Nginx pour ${DOMAIN}..."
cat > /etc/nginx/sites-available/${DOMAIN} << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name drava.payool.net;

    access_log /var/log/nginx/drava.payool.net.access.log;
    error_log /var/log/nginx/drava.payool.net.error.log;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

echo "🔗 Activation de la configuration..."
ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/

echo "🧪 Test de la configuration Nginx..."
nginx -t

echo "🔄 Rechargement de Nginx..."
systemctl reload nginx

echo "✅ Configuration Nginx terminée!"

echo ""
echo "🔒 Installation de Certbot pour SSL..."
if ! command -v certbot &> /dev/null; then
    apt install certbot python3-certbot-nginx -y
fi

echo "📜 Obtention du certificat SSL..."
echo "⚠️  IMPORTANT: Assurez-vous que le DNS de ${DOMAIN} pointe bien vers ce serveur avant de continuer!"
echo "Appuyez sur Entrée pour continuer ou Ctrl+C pour annuler..."
read

certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@payool.net || {
    echo "⚠️  Erreur lors de l'obtention du certificat SSL"
    echo "Vous pouvez le faire manuellement avec: certbot --nginx -d ${DOMAIN}"
}

echo ""
echo "✅ Configuration terminée!"
echo "🌐 Votre site est accessible sur:"
echo "   - http://${DOMAIN}"
echo "   - https://${DOMAIN} (si SSL configuré)"
echo ""
echo "📊 Commandes utiles:"
echo "   - Logs Nginx: tail -f /var/log/nginx/${DOMAIN}.access.log"
echo "   - Logs Docker: cd /opt/dravacard && docker-compose logs -f"
echo "   - Redémarrer Nginx: systemctl restart nginx"

ENDSSH

echo "✅ Configuration du domaine terminée!"
