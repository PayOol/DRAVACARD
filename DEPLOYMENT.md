# 🚀 Guide de Déploiement DRAVACARD sur VPS

## 📋 Prérequis

### Sur votre machine locale
- Git installé
- Accès SSH au VPS (clé SSH configurée)
- Les fichiers du projet

### Sur le VPS (72.61.194.1)
- Ubuntu/Debian ou distribution Linux similaire
- Accès root ou sudo
- Docker et Docker Compose (seront installés automatiquement si nécessaire)

## 🔧 Configuration Initiale du VPS

### 1. Connexion au VPS

```bash
ssh root@72.61.194.1
```

### 2. Installation de Docker (si pas déjà installé)

```bash
# Mise à jour du système
apt update && apt upgrade -y

# Installation de Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Démarrage de Docker
systemctl start docker
systemctl enable docker

# Installation de Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Vérification
docker --version
docker-compose --version
```

### 3. Configuration du Firewall (optionnel mais recommandé)

```bash
# Installer UFW si nécessaire
apt install ufw -y

# Autoriser SSH
ufw allow 22/tcp

# Autoriser le port de l'application
ufw allow 3000/tcp

# Activer le firewall
ufw enable
```

## 📦 Déploiement

### Méthode 1: Transfert Manuel des Fichiers

#### 1. Créer le répertoire sur le VPS

```bash
ssh root@72.61.194.1 "mkdir -p /opt/dravacard"
```

#### 2. Transférer les fichiers depuis votre machine locale

```bash
# Depuis le répertoire du projet
scp -r * root@72.61.194.1:/opt/dravacard/
```

#### 3. Se connecter au VPS et démarrer l'application

```bash
ssh root@72.61.194.1
cd /opt/dravacard

# Construire et démarrer
docker-compose up -d --build
```

### Méthode 2: Utilisation du Script de Déploiement

#### 1. Rendre le script exécutable

```bash
chmod +x deploy.sh
```

#### 2. Modifier le script si nécessaire

Ouvrez `deploy.sh` et modifiez:
- `VPS_USER` si vous n'utilisez pas root
- `APP_DIR` si vous voulez un autre emplacement

#### 3. Exécuter le déploiement

```bash
./deploy.sh
```

### Méthode 3: Déploiement avec Git (Recommandé)

#### 1. Sur le VPS, cloner le repository

```bash
ssh root@72.61.194.1
cd /opt
git clone <votre-repo-git> dravacard
cd dravacard
```

#### 2. Démarrer l'application

```bash
docker-compose up -d --build
```

## 🔍 Vérification du Déploiement

### Vérifier que les conteneurs tournent

```bash
ssh root@72.61.194.1 "cd /opt/dravacard && docker-compose ps"
```

### Voir les logs

```bash
ssh root@72.61.194.1 "cd /opt/dravacard && docker-compose logs -f"
```

### Tester l'application

Ouvrez votre navigateur et accédez à:
```
http://72.61.194.1:3000
```

## 🛠️ Commandes Utiles

### Redémarrer l'application

```bash
ssh root@72.61.194.1 "cd /opt/dravacard && docker-compose restart"
```

### Arrêter l'application

```bash
ssh root@72.61.194.1 "cd /opt/dravacard && docker-compose down"
```

### Mettre à jour l'application

```bash
ssh root@72.61.194.1 << 'EOF'
cd /opt/dravacard
git pull  # Si vous utilisez Git
docker-compose down
docker-compose build --no-cache
docker-compose up -d
docker system prune -f
EOF
```

### Voir les logs en temps réel

```bash
ssh root@72.61.194.1 "cd /opt/dravacard && docker-compose logs -f dravacard"
```

### Accéder au conteneur

```bash
ssh root@72.61.194.1 "docker exec -it dravacard-app sh"
```

### Nettoyer les ressources Docker

```bash
ssh root@72.61.194.1 "docker system prune -a -f"
```

## 🌐 Configuration d'un Nom de Domaine (Optionnel)

Si vous voulez utiliser un nom de domaine au lieu de l'IP:

### 1. Configurer les DNS

Pointez votre domaine vers `72.61.194.1`

### 2. Installer Nginx comme reverse proxy

```bash
ssh root@72.61.194.1
apt install nginx -y

# Créer la configuration
cat > /etc/nginx/sites-available/dravacard << 'EOF'
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Activer la configuration
ln -s /etc/nginx/sites-available/dravacard /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 3. Installer SSL avec Let's Encrypt

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d votre-domaine.com
```

## 🔒 Sécurité

### Recommandations

1. **Changer le port SSH par défaut**
2. **Désactiver l'authentification par mot de passe** (utiliser uniquement les clés SSH)
3. **Installer fail2ban** pour protéger contre les attaques par force brute
4. **Mettre à jour régulièrement** le système et Docker
5. **Utiliser HTTPS** avec un certificat SSL

### Installation de fail2ban

```bash
ssh root@72.61.194.1
apt install fail2ban -y
systemctl enable fail2ban
systemctl start fail2ban
```

## 📊 Monitoring

### Voir l'utilisation des ressources

```bash
ssh root@72.61.194.1 "docker stats"
```

### Voir l'espace disque

```bash
ssh root@72.61.194.1 "df -h"
```

## 🆘 Dépannage

### L'application ne démarre pas

```bash
# Vérifier les logs
ssh root@72.61.194.1 "cd /opt/dravacard && docker-compose logs"

# Reconstruire complètement
ssh root@72.61.194.1 "cd /opt/dravacard && docker-compose down -v && docker-compose up -d --build"
```

### Port déjà utilisé

```bash
# Voir quel processus utilise le port 3000
ssh root@72.61.194.1 "lsof -i :3000"

# Tuer le processus si nécessaire
ssh root@72.61.194.1 "kill -9 <PID>"
```

### Problèmes de mémoire

```bash
# Augmenter la swap si nécessaire
ssh root@72.61.194.1 << 'EOF'
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
EOF
```

## 📝 Notes

- L'application est accessible sur le port **3000**
- Les logs Nginx sont stockés dans `./logs/nginx/`
- Le conteneur redémarre automatiquement en cas de crash (`restart: unless-stopped`)
- Les fichiers statiques sont servis par Nginx pour de meilleures performances

## 🔄 Sauvegarde

### Créer une sauvegarde

```bash
ssh root@72.61.194.1 "cd /opt && tar -czf dravacard-backup-$(date +%Y%m%d).tar.gz dravacard/"
```

### Restaurer une sauvegarde

```bash
ssh root@72.61.194.1 "cd /opt && tar -xzf dravacard-backup-YYYYMMDD.tar.gz"
```

---

**Support**: Pour toute question, consultez la documentation Docker ou Next.js.
