#!/bin/bash
# =============================================================================
# ZapiEat — Script de actualización
# =============================================================================
#
# USO: Ejecutar en el VPS cada vez que quieras desplegar una nueva versión
#
#   bash /opt/zasfood/deploy/update.sh
#
# =============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warning() { echo -e "${YELLOW}[AVISO]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

APP_DIR="/opt/zasfood"

if [ "$EUID" -ne 0 ]; then
  error "Este script debe ejecutarse como root. Usa: sudo bash update.sh"
fi

info "======================================================="
info "  ZapiEat — Actualizando a la última versión"
info "======================================================="

cd "$APP_DIR"

# -----------------------------------------------------------------------------
# Obtener los últimos cambios del repositorio
# -----------------------------------------------------------------------------
info "Descargando últimos cambios del repositorio..."
git pull

# -----------------------------------------------------------------------------
# Reconstruir y reiniciar los contenedores
# -----------------------------------------------------------------------------
info "Reconstruyendo e iniciando los contenedores..."
info "Esto puede tardar unos minutos..."

docker compose -f deploy/docker-compose.prod.yml --env-file "$APP_DIR/.env" up --build -d

# -----------------------------------------------------------------------------
# Esperar a que la app responda
# -----------------------------------------------------------------------------
info "Esperando a que la aplicación esté lista..."
MAX_WAIT=180
WAITED=0
until curl -sf http://localhost:3000/api/health > /dev/null 2>&1; do
  if [ $WAITED -ge $MAX_WAIT ]; then
    error "La aplicación no respondió en $MAX_WAIT segundos. Revisa los logs: docker compose -f deploy/docker-compose.prod.yml --env-file $APP_DIR/.env logs app"
  fi
  sleep 5
  WAITED=$((WAITED + 5))
  info "Esperando... ($WAITED/${MAX_WAIT}s)"
done

# -----------------------------------------------------------------------------
# Limpiar imágenes Docker antiguas para liberar espacio
# -----------------------------------------------------------------------------
info "Limpiando imágenes Docker antiguas..."
docker image prune -f

info "======================================================="
info "  Actualizacion completada correctamente"
info "  Ver logs: docker compose -f $APP_DIR/deploy/docker-compose.prod.yml --env-file $APP_DIR/.env logs -f app"
info "======================================================="
