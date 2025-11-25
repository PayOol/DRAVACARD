# Étape 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY bun.lock* ./

# Installer les dépendances
RUN npm ci

# Copier le reste du code
COPY . .

# Build de l'application Next.js (export statique)
RUN npm run build

# Étape 2: Production avec Nginx
FROM nginx:alpine

# Copier la configuration Nginx personnalisée
COPY nginx.conf /etc/nginx/nginx.conf

# Copier les fichiers buildés depuis l'étape précédente
COPY --from=builder /app/out /usr/share/nginx/html

# Exposer le port 80
EXPOSE 80

# Démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]
