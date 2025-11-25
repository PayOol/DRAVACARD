# 🌐 Configuration du Domaine drava.payool.net

Ce guide explique comment configurer le domaine **drava.payool.net** pour pointer vers votre application DRAVACARD sur le VPS.

## 📋 Prérequis

- Accès au panneau de configuration DNS de **payool.net**
- Accès SSH au VPS (72.61.194.1)
- Application DRAVACARD déjà déployée et fonctionnelle sur le port 3000

## 🔧 Étape 1 : Configuration DNS

### Ajouter un enregistrement DNS

Dans le panneau de configuration DNS de **payool.net**, ajoutez un enregistrement de type **A** :

```
Type: A
Nom: drava
Valeur: 72.61.194.1
TTL: 3600 (ou Auto)
```

**Résultat** : `drava.payool.net` pointera vers `72.61.194.1`

### Vérification DNS

Attendez quelques minutes (propagation DNS), puis vérifiez :

```bash
# Depuis votre machine locale
nslookup drava.payool.net

# Ou
ping drava.payool.net
```

Vous devriez voir l'IP **72.61.194.1**.

## 🚀 Étape 2 : Installation de Nginx sur le VPS

Si Nginx n'est pas déjà installé sur votre VPS :

```bash
# Se connecter au VPS
ssh root@72.61.194.1

# Mettre à jour le système
apt update && apt upgrade -y

# Installer Nginx
apt install nginx -y

# Démarrer et activer Nginx
systemctl start nginx
systemctl enable nginx

# Vérifier le statut
systemctl status nginx
```

## 📝 Étape 3 : Configuration du Reverse Proxy Nginx

### 1. Créer le fichier de configuration

```bash
# Sur le VPS
ssh root@72.61.194.1

# Créer le fichier de configuration
nano /etc/nginx/sites-available/drava.payool.net
```

### 2. Copier la configuration

Copiez le contenu du fichier **`nginx-reverse-proxy.conf`** dans le fichier créé.

Ou utilisez cette commande pour le faire automatiquement :

```bash
cat > /etc/nginx/sites-available/drava.payool.net << 'EOF'
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
```

### 3. Activer la configuration

```bash
# Créer un lien symbolique vers sites-enabled
ln -s /etc/nginx/sites-available/drava.payool.net /etc/nginx/sites-enabled/

# Tester la configuration Nginx
nginx -t

# Si le test est OK, recharger Nginx
systemctl reload nginx
```

### 4. Vérifier que ça fonctionne

Ouvrez votre navigateur et accédez à :
```
http://drava.payool.net
```

Vous devriez voir votre application DRAVACARD !

## 🔒 Étape 4 : Installation du Certificat SSL (HTTPS)

### 1. Installer Certbot

```bash
# Sur le VPS
ssh root@72.61.194.1

# Installer Certbot et le plugin Nginx
apt install certbot python3-certbot-nginx -y
```

### 2. Obtenir le certificat SSL

```bash
# Obtenir et installer automatiquement le certificat
certbot --nginx -d drava.payool.net

# Suivre les instructions :
# - Entrez votre email
# - Acceptez les conditions
# - Choisissez de rediriger HTTP vers HTTPS (recommandé)
```

### 3. Renouvellement automatique

Certbot configure automatiquement le renouvellement. Vérifiez :

```bash
# Tester le renouvellement
certbot renew --dry-run

# Vérifier le timer systemd
systemctl status certbot.timer
```

Le certificat sera automatiquement renouvelé tous les 90 jours.

### 4. Vérifier HTTPS

Accédez à :
```
https://drava.payool.net
```

Vous devriez voir le cadenas vert 🔒 dans votre navigateur !

## 🔥 Étape 5 : Configuration du Firewall

### Autoriser les ports HTTP et HTTPS

```bash
# Si vous utilisez UFW
ufw allow 'Nginx Full'

# Ou manuellement
ufw allow 80/tcp
ufw allow 443/tcp

# Vérifier le statut
ufw status
```

## 📊 Vérifications et Tests

### 1. Vérifier que Nginx tourne

```bash
systemctl status nginx
```

### 2. Vérifier que Docker tourne

```bash
docker ps
```

Vous devriez voir le conteneur **dravacard-app** en cours d'exécution.

### 3. Vérifier les logs Nginx

```bash
# Logs d'accès
tail -f /var/log/nginx/drava.payool.net.access.log

# Logs d'erreur
tail -f /var/log/nginx/drava.payool.net.error.log
```

### 4. Vérifier les logs Docker

```bash
cd /opt/dravacard
docker-compose logs -f
```

### 5. Test de performance

```bash
# Test de réponse HTTP
curl -I http://drava.payool.net

# Test de réponse HTTPS
curl -I https://drava.payool.net
```

## 🛠️ Commandes Utiles

### Redémarrer Nginx

```bash
systemctl restart nginx
```

### Recharger la configuration Nginx (sans interruption)

```bash
systemctl reload nginx
```

### Désactiver un site

```bash
rm /etc/nginx/sites-enabled/drava.payool.net
systemctl reload nginx
```

### Voir tous les sites actifs

```bash
ls -la /etc/nginx/sites-enabled/
```

## 🔧 Dépannage

### Le site ne s'affiche pas

1. **Vérifier que le DNS pointe bien vers le VPS**
   ```bash
   nslookup drava.payool.net
   ```

2. **Vérifier que Nginx écoute sur le port 80**
   ```bash
   netstat -tulpn | grep :80
   ```

3. **Vérifier que le conteneur Docker tourne**
   ```bash
   docker ps | grep dravacard
   ```

4. **Vérifier les logs Nginx**
   ```bash
   tail -50 /var/log/nginx/error.log
   ```

### Erreur 502 Bad Gateway

Cela signifie que Nginx ne peut pas se connecter au conteneur Docker :

```bash
# Vérifier que le conteneur est bien sur le port 3000
docker ps

# Vérifier que le port 3000 est accessible
curl http://localhost:3000

# Redémarrer le conteneur si nécessaire
cd /opt/dravacard
docker-compose restart
```

### Erreur de certificat SSL

```bash
# Forcer le renouvellement
certbot renew --force-renewal

# Vérifier la configuration SSL
nginx -t
```

### Le port 80 est déjà utilisé

```bash
# Voir ce qui utilise le port 80
lsof -i :80

# Si c'est Apache, l'arrêter
systemctl stop apache2
systemctl disable apache2
```

## 📈 Optimisations (Optionnel)

### 1. Activer la compression Gzip dans Nginx

Éditez `/etc/nginx/nginx.conf` et ajoutez dans le bloc `http` :

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
```

### 2. Activer le cache Nginx

Ajoutez dans `/etc/nginx/nginx.conf` dans le bloc `http` :

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m use_temp_path=off;
```

Puis dans votre configuration de site, ajoutez dans le bloc `location /` :

```nginx
proxy_cache my_cache;
proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
```

### 3. Limiter le taux de requêtes (protection DDoS)

Dans `/etc/nginx/nginx.conf`, dans le bloc `http` :

```nginx
limit_req_zone $binary_remote_addr zone=mylimit:10m rate=10r/s;
```

Dans votre configuration de site :

```nginx
limit_req zone=mylimit burst=20 nodelay;
```

## 📝 Résumé

Après avoir suivi ce guide, vous aurez :

✅ DNS configuré : `drava.payool.net` → `72.61.194.1`  
✅ Nginx installé et configuré comme reverse proxy  
✅ Certificat SSL Let's Encrypt installé (HTTPS)  
✅ Renouvellement automatique du certificat  
✅ Application accessible sur `https://drava.payool.net`  

## 🆘 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs Nginx : `/var/log/nginx/`
2. Vérifiez les logs Docker : `docker-compose logs`
3. Testez la configuration Nginx : `nginx -t`
4. Vérifiez que tous les services tournent : `systemctl status nginx` et `docker ps`

---

**Accès final** : https://drava.payool.net 🎉
