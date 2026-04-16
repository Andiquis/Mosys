#!/bin/bash
# Script universal: inicializa Git si no existe y luego actualiza

REPO_URL="https://github.com/Andiquis/Mosys.git"
BRANCH="main"

# Ir a la carpeta objetivo (../ del script)
TARGET_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$TARGET_DIR" || exit 1

echo "📁 Trabajando en: $TARGET_DIR"

# 🔧 1. Verificar si ya es repo Git
if [ ! -d ".git" ]; then
    echo "⚙️ No es repositorio Git. Inicializando..."

    git init
    git remote add origin "$REPO_URL"
    git fetch origin "$BRANCH"

    echo "⬇️ Sincronizando con GitHub (modo limpio)..."
    git reset --hard "origin/$BRANCH"

    echo "✅ Proyecto convertido en repo y sincronizado."
    exit 0
fi

# 🔗 2. Verificar remoto
if ! git remote get-url origin >/dev/null 2>&1; then
    echo "⚙️ Configurando remoto origin..."
    git remote add origin "$REPO_URL"
fi

echo "📡 Conectando con GitHub para buscar cambios..."

# Obtener cambios
git fetch origin "$BRANCH"

LOCAL=$(git rev-parse @ 2>/dev/null || echo "")
REMOTE=$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "")

if [ -z "$LOCAL" ] || [ -z "$REMOTE" ]; then
    echo "❌ Error al obtener información del repositorio."
    exit 1
fi

# 🔍 Comparación
if [ "$LOCAL" = "$REMOTE" ]; then
    echo "✅ Ya estás actualizado con GitHub."
else
    echo "⬇️ Hay cambios en GitHub. Actualizando..."

    if git pull origin "$BRANCH"; then
        echo "✅ Actualización completada correctamente."
    else
        echo "⚠️ Conflictos detectados con cambios locales."
        echo "-------------------------------------"
        read -p "¿Deseas sobrescribir TODO con la versión de GitHub? (s/n): " force_dl

        if [[ "$force_dl" == "s" || "$force_dl" == "S" ]]; then
            echo "💣 Forzando sincronización..."
            git reset --hard "origin/$BRANCH"
            echo "✅ Proyecto sincronizado completamente."
        else
            echo "❌ Operación cancelada. Resuelve conflictos manualmente."
            exit 1
        fi
    fi
fi