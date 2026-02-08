# 📄 Guía Rápida: Exportar Markdown a PDF con Pandoc + Chrome

> Tutorial puntual para convertir archivos `.md` a `.pdf` con estilo profesional.

---

## 1. Instalar Pandoc

```bash
# Ubuntu/Debian
sudo apt install pandoc

# macOS
brew install pandoc

# Verificar
pandoc --version
```

## 2. Conversión básica (MD → HTML → PDF)

### Paso A: Markdown a HTML

```bash
pandoc README.md -o output.html --standalone
```

| Flag             | Qué hace                                      |
| ---------------- | --------------------------------------------- |
| `-o output.html` | Archivo de salida                             |
| `--standalone`   | Genera HTML completo (con `<head>`, `<body>`) |

### Paso B: HTML a PDF con Chrome

```bash
google-chrome --headless --disable-gpu --no-sandbox \
  --print-to-pdf=output.pdf \
  --print-to-pdf-no-header \
  output.html
```

| Flag                       | Qué hace                     |
| -------------------------- | ---------------------------- |
| `--headless`               | Sin ventana visible          |
| `--print-to-pdf=`          | Ruta del PDF de salida       |
| `--print-to-pdf-no-header` | Sin encabezado/pie de página |

## 3. Con estilos CSS personalizados

```bash
# Crear HTML con CSS embebido
pandoc README.md -o output.html \
  --standalone \
  --css=mi-estilo.css \
  --embed-resources

# Luego a PDF
google-chrome --headless --disable-gpu --no-sandbox \
  --print-to-pdf=output.pdf \
  --print-to-pdf-no-header \
  output.html
```

## 4. Comando todo en uno (copiar y pegar)

```bash
pandoc README.md -o /tmp/doc.html --standalone --embed-resources --css=docs/pdf-style.css && \
google-chrome --headless --disable-gpu --no-sandbox --print-to-pdf=README.pdf --print-to-pdf-no-header /tmp/doc.html
```

## 5. Flags útiles de Pandoc

| Flag                         | Uso                              |
| ---------------------------- | -------------------------------- |
| `--toc`                      | Genera tabla de contenidos       |
| `--metadata title="Mi Doc"`  | Título del documento             |
| `--highlight-style=pygments` | Resaltado de código              |
| `--number-sections`          | Numera los títulos               |
| `--css=style.css`            | Aplica CSS externo               |
| `--embed-resources`          | Incrusta imágenes/CSS en el HTML |

---

_Eso es todo. MD → HTML → PDF. Simple._ ✅
