#!/bin/bash
# =============================================================================
# ZapiEat — Script de despliegue inicial en VPS Ubuntu 24
# =============================================================================
#
# USO:
#   1. Sube este script al servidor:
#        scp deploy/deploy.sh usuario@IP_VPS:~/deploy.sh
#
#   2. Conéctate al servidor:
#        ssh usuario@IP_VPS
#
#   3. Ejecuta el script:
#        bash ~/deploy.sh
#
# REQUISITOS PREVIOS:
#   - Ubuntu 24.04 en el VPS
#   - El dominio zapieat.app y *.zapieat.app ya apuntando a la IP del VPS
#   - URL del repositorio Git público
#
# =============================================================================

set -e  # Detener el script si cualquier comando falla

# -----------------------------------------------------------------------------
# Colores para los mensajes
# -----------------------------------------------------------------------------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sin color

info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warning() { echo -e "${YELLOW}[AVISO]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# -----------------------------------------------------------------------------
# Variables de configuración — EDITAR ANTES DE EJECUTAR
# -----------------------------------------------------------------------------
REPO_URL="https://github.com/sergio93ibz/zapieat.git"
APP_DIR="/opt/zasfood"
DOMAIN="zapieat.app"

# -----------------------------------------------------------------------------
# Verificar que se ejecuta con privilegios suficientes
# -----------------------------------------------------------------------------
if [ "$EUID" -ne 0 ]; then
  error "Este script debe ejecutarse como root. Usa: sudo bash deploy.sh"
fi

info "======================================================="
info "  ZapiEat — Despliegue en producción"
info "  Dominio: $DOMAIN"
info "  Directorio: $APP_DIR"
info "======================================================="

# -----------------------------------------------------------------------------
# PASO 1 — Actualizar el sistema
# -----------------------------------------------------------------------------
info "Paso 1/8 — Actualizando el sistema..."
apt-get update -y
apt-get upgrade -y

# -----------------------------------------------------------------------------
# PASO 2 — Instalar dependencias previas
# -----------------------------------------------------------------------------
info "Paso 2/8 — Instalando dependencias previas..."
apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  git \
  nginx \
  certbot \
  python3-certbot-nginx

# -----------------------------------------------------------------------------
# PASO 3 — Instalar Docker desde el repositorio oficial
# -----------------------------------------------------------------------------
info "Paso 3/8 — Instalando Docker (repositorio oficial)..."

install -m 0755 -d /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin

systemctl enable --now docker

info "Docker instalado correctamente:"
docker --version
docker compose version

# -----------------------------------------------------------------------------
# PASO 4 — Clonar el repositorio
# -----------------------------------------------------------------------------
info "Paso 4/8 — Clonando el repositorio en $APP_DIR..."

if [ -d "$APP_DIR/.git" ]; then
  warning "El repositorio ya existe en $APP_DIR. Haciendo git pull..."
  cd "$APP_DIR"
  git pull
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# -----------------------------------------------------------------------------
# PASO 5 — Configurar variables de entorno
# -----------------------------------------------------------------------------
info "Paso 5/8 — Configurando variables de entorno..."

# Si ya existe un .env pero le faltan variables de producción, hay que recrearlo
if [ -f "$APP_DIR/.env" ] && grep -q "<CAMBIAR" "$APP_DIR/.env"; then
  warning "El .env existe pero aún tiene valores de ejemplo. Debes editarlo."
fi

# Si no existe el .env o tiene valores de ejemplo, crear uno desde la plantilla y pausar
if [ ! -f "$APP_DIR/.env" ] || grep -q "<CAMBIAR" "$APP_DIR/.env"; then
  cp "$APP_DIR/deploy/.env.production.example" "$APP_DIR/.env"
  echo ""
  warning "======================================================="
  warning "  ACCION REQUERIDA — Configurar el archivo .env"
  warning "======================================================="
  warning "Se ha creado el archivo $APP_DIR/.env"
  warning ""
  warning "Genera los secretos ejecutando estos comandos:"
  warning "  openssl rand -base64 32   -> para AUTH_SECRET"
  warning "  openssl rand -hex 32      -> para ENCRYPTION_KEY"
  warning ""
  warning "Luego edita el archivo con todos los valores:"
  warning "  nano $APP_DIR/.env"
  warning ""
  warning "Valores que DEBES cambiar:"
  warning "  - POSTGRES_PASSWORD"
  warning "  - AUTH_SECRET"
  warning "  - ENCRYPTION_KEY"
  warning "  - RESEND_API_KEY"
  warning "  - EMAIL_FROM"
  warning ""
  warning "Cuando termines, vuelve a ejecutar:"
  warning "  bash ~/deploy.sh"
  warning "======================================================="
  exit 0
fi

# Verificar que no queden valores de ejemplo sin rellenar
if grep -q "<CAMBIAR" "$APP_DIR/.env"; then
  error "El archivo .env aún tiene valores de ejemplo (<CAMBIAR...>). Edítalo antes de continuar: nano $APP_DIR/.env"
fi

info "Archivo .env configurado correctamente, continuando..."

# -----------------------------------------------------------------------------
# PASO 6 — Configurar Nginx
# -----------------------------------------------------------------------------
info "Paso 6/8 — Configurando Nginx..."

cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/zapieat

# Eliminar el site por defecto de Nginx si existe
if [ -f /etc/nginx/sites-enabled/default ]; then
  rm /etc/nginx/sites-enabled/default
  info "Site por defecto de Nginx eliminado."
fi

# Activar la configuración de ZapiEat
if [ ! -L /etc/nginx/sites-enabled/zapieat ]; then
  ln -s /etc/nginx/sites-available/zapieat /etc/nginx/sites-enabled/zapieat
fi

nginx -t || error "La configuración de Nginx tiene errores. Revisa /etc/nginx/sites-available/zapieat"
systemctl reload nginx
info "Nginx configurado correctamente."

# -----------------------------------------------------------------------------
# PASO 7 — Levantar los contenedores Docker
# -----------------------------------------------------------------------------
info "Paso 7/8 — Construyendo e iniciando los contenedores..."
info "Este proceso puede tardar varios minutos la primera vez..."

cd "$APP_DIR"
docker compose -f deploy/docker-compose.prod.yml up --build -d

info "Esperando a que la aplicación esté lista..."
MAX_WAIT=120
WAITED=0
until curl -sf http://localhost:3000/api/health > /dev/null 2>&1; do
  if [ $WAITED -ge $MAX_WAIT ]; then
    error "La aplicación no respondió en $MAX_WAIT segundos. Revisa los logs: docker compose -f deploy/docker-compose.prod.yml logs app"
  fi
  sleep 5
  WAITED=$((WAITED + 5))
  info "Esperando... ($WAITED/${MAX_WAIT}s)"
done

info "La aplicación esta respondiendo en http://localhost:3000"

# -----------------------------------------------------------------------------
# PASO 8 — Configurar SSL con Let's Encrypt
# -----------------------------------------------------------------------------
info "Paso 8/8 — Configurando SSL con Let's Encrypt..."
echo ""
warning "======================================================="
warning "  CONFIGURACION DE SSL (wildcard)"
warning "======================================================="
warning "Para el wildcard *.${DOMAIN} necesitas hacer el"
warning "challenge por DNS. Certbot te pedirá que añadas un"
warning "registro TXT en tu proveedor de dominio."
warning ""
warning "Cuando certbot muestre el valor del registro TXT:"
warning "  1. Ve al panel de tu proveedor de dominio"
warning "  2. Añade un registro TXT en _acme-challenge.${DOMAIN}"
warning "  3. Espera 1-2 minutos y pulsa Enter en certbot"
warning "======================================================="
echo ""

certbot --nginx \
  -d "$DOMAIN" \
  -d "*.$DOMAIN" \
  --manual \
  --preferred-challenges dns \
  --agree-tos \
  --no-eff-email || warning "SSL no configurado. Puedes ejecutarlo manualmente luego: sudo certbot --nginx -d $DOMAIN -d '*.$DOMAIN' --manual --preferred-challenges dns"

# -----------------------------------------------------------------------------
# Resumen final
# -----------------------------------------------------------------------------
echo ""
info "======================================================="
info "  Despliegue completado"
info "======================================================="
info "  App corriendo en:    https://$DOMAIN"
info "  Ver logs:            docker compose -f $APP_DIR/deploy/docker-compose.prod.yml logs -f app"
info "  Estado contenedores: docker compose -f $APP_DIR/deploy/docker-compose.prod.yml ps"
info "  Healthcheck:         curl https://$DOMAIN/api/health"
info "  Actualizar:          bash $APP_DIR/deploy/update.sh"
info "======================================================="
