#!/bin/bash
# Script para subir cambios a GitHub (Mosys) de forma robusta

REPO_URL="https://github.com/Andiquis/Mosys.git"
BRANCH="main"

echo "🚀 Iniciando proceso de subida..."

# Ir a la carpeta Mosys (../ del script)
TARGET_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$TARGET_DIR" || exit 1

echo "📁 Proyecto: $TARGET_DIR"

# 🔧 1. Verificar si es repo Git
if [ ! -d ".git" ]; then
  echo "⚙️ No es repositorio Git. Inicializando..."

  git init
  git remote add origin "$REPO_URL"

  echo "⬇️ Sincronizando primero con GitHub..."
  git fetch origin "$BRANCH"
  git reset --hard "origin/$BRANCH"

  echo "✅ Repo inicializado y alineado con remoto."
fi

# 🔗 2. Verificar remoto
if ! git remote get-url origin >/dev/null 2>&1; then
  echo "⚙️ Configurando remoto origin..."
  git remote add origin "$REPO_URL"
fi

# 📡 3. Asegurar sincronización antes de subir
echo "📡 Sincronizando antes de subir..."
git fetch origin "$BRANCH"

LOCAL=$(git rev-parse @ 2>/dev/null || echo "")
REMOTE=$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "")

if [ "$LOCAL" != "$REMOTE" ]; then
  echo "⬇️ Hay cambios en GitHub. Integrando primero..."

  if ! git pull origin "$BRANCH"; then
    echo "⚠️ Conflictos detectados antes de subir."
    read -p "¿Deseas sobrescribir con remoto antes de subir? (s/n): " force

    if [[ "$force" == "s" || "$force" == "S" ]]; then
      git reset --hard "origin/$BRANCH"
    else
      echo "❌ Cancelado. Resuelve conflictos manualmente."
      exit 1
    fi
  fi
fi

# 🔍 4. Verificar cambios locales
if [[ -z $(git status -s) ]]; then
  echo "✅ No hay cambios pendientes por subir."
  exit 0
fi

# ➕ 5. Añadir cambios
git add .

# 📝 6. Commit
read -p "Introduce mensaje del commit (Enter = automático): " commit_msg
if [[ -z "$commit_msg" ]]; then
  commit_msg="Auto-update: $(date +'%Y-%m-%d %H:%M:%S')"
fi

git commit -m "$commit_msg" || echo "⚠️ Nada que commitear."

# 🚀 7. Push con reintentos
max_retries=3
attempt=1

while [ $attempt -le $max_retries ]; do
  echo "🚀 Subiendo a GitHub (Intento $attempt/$max_retries)..."

  if git push origin "$BRANCH"; then
    echo "✅ ¡Subida exitosa!"
    break
  else
    echo "⚠️ Error al subir..."
    attempt=$((attempt+1))

    if [ $attempt -le $max_retries ]; then
      echo "⏳ Reintentando en 3s..."
      sleep 3
    else
      echo "❌ Fallo definitivo. Revisa conexión o permisos."
      exit 1
    fi
  fi
done