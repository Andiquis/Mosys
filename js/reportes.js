/**
 * Mosys - Sistema de Dinero Personal
 * Módulo de Reportes y Análisis
 */

class ReportesManager {
  constructor() {
    this.charts = {}
  }

  generarReporteGeneral() {
    try {
      const estadisticasDb = db.getEstadisticasDashboard()
      const estadisticasMovimientos = movimientosManager.obtenerEstadisticas('mes')
      const resumenDeudas = deudasManager.obtenerResumen()

      return {
        ...estadisticasDb,
        ...estadisticasMovimientos,
        deudas: resumenDeudas,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error('Error al generar reporte general:', error)
      return null
    }
  }

  generarGraficoPorCategorias() {
    try {
      const categorias = movimientosManager.obtenerPorCategoria('Gasto')

      // Si no hay datos, mostrar gráfico vacío
      if (!categorias.length) {
        return {
          type: 'doughnut',
          data: {
            labels: ['Sin datos'],
            datasets: [
              {
                data: [1],
                backgroundColor: ['#e5e7eb'],
                borderWidth: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom' },
              tooltip: { enabled: false },
            },
          },
        }
      }

      const labels = categorias.map(cat => cat.categoria)
      const data = categorias.map(cat => cat.total)
      const colors = categorias.map(cat => cat.color || this.generarColor())

      return {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [
            {
              data: data,
              backgroundColor: colors,
              borderWidth: 2,
              borderColor: '#ffffff',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const total = context.dataset.data.reduce((a, b) => a + b, 0)
                  const percentage = ((context.parsed * 100) / total).toFixed(1)
                  return `${context.label}: ${formatCurrency(context.parsed)} (${percentage}%)`
                },
              },
            },
          },
        },
      }
    } catch (error) {
      console.error('Error al generar gráfico de categorías:', error)
      return null
    }
  }

  generarGraficoTendencias(meses = 12) {
    try {
      const datos = movimientosManager.obtenerTendencias(meses)

      if (!datos || datos.length === 0) {
        return {
          type: 'bar',
          data: {
            labels: ['Sin datos'],
            datasets: [
              {
                label: 'Sin datos',
                data: [0],
                backgroundColor: '#e5e7eb',
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
          },
        }
      }

      // Procesar datos
      const mesesMap = {}
      datos.forEach(d => {
        if (!mesesMap[d.mes]) {
          mesesMap[d.mes] = { ingreso: 0, gasto: 0 }
        }
        if (d.tipo === 'Ingreso') mesesMap[d.mes].ingreso = d.total
        if (d.tipo === 'Gasto') mesesMap[d.mes].gasto = d.total
      })

      const labels = Object.keys(mesesMap).sort()
      const ingresos = labels.map(m => mesesMap[m].ingreso)
      const gastos = labels.map(m => mesesMap[m].gasto)

      return {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Ingresos',
              data: ingresos,
              backgroundColor: '#059669',
              borderRadius: 4,
            },
            {
              label: 'Gastos',
              data: gastos,
              backgroundColor: '#dc2626',
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: '#f3f4f6' },
              ticks: {
                callback: function (value) {
                  return formatCurrency(value)
                },
              },
            },
            x: {
              grid: { display: false },
            },
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function (context) {
                  return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
                },
              },
            },
          },
        },
      }
    } catch (error) {
      console.error('Error al generar gráfico de tendencias:', error)
      return null
    }
  }

  async generarGraficoTrading(periodo = '1m') {
    try {
      const historial = movimientosManager.obtenerHistorialBalance(periodo)

      if (!historial || historial.length === 0) {
        return {
          type: 'line',
          data: {
            labels: ['Sin datos'],
            datasets: [
              {
                data: [0],
                borderColor: '#e5e7eb',
                borderDash: [5, 5],
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
          },
        }
      }

      const labels = historial.map(h => {
        const fecha = new Date(h.fecha)
        return periodo === '1d'
          ? fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : fecha.toLocaleDateString()
      })
      const data = historial.map(h => h.balance)

      // Determinar color basado en tendencia (Inicio vs Fin)
      const startBalance = data[0]
      const endBalance = data[data.length - 1]
      const isProfit = endBalance >= startBalance
      const linkColor = isProfit ? '#059669' : '#dc2626' // Green or Red

      // Crear gradiente
      const ctx = document.getElementById('balanceTradingChart').getContext('2d')
      const gradient = ctx.createLinearGradient(0, 0, 0, 400)
      gradient.addColorStop(0, isProfit ? 'rgba(5, 150, 105, 0.5)' : 'rgba(220, 38, 38, 0.5)')
      gradient.addColorStop(1, isProfit ? 'rgba(5, 150, 105, 0.0)' : 'rgba(220, 38, 38, 0.0)')

      return {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Balance',
              data: data,
              borderColor: linkColor,
              backgroundColor: gradient,
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 0, // Hide points for clean trading look
              pointHoverRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { maxTicksLimit: 8 },
            },
            y: {
              grid: { color: '#f3f4f6' },
              ticks: {
                callback: function (value) {
                  return formatCurrency(value)
                },
              },
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (context) {
                  return `Saldo: ${formatCurrency(context.parsed.y)}`
                },
              },
            },
          },
        },
      }
    } catch (error) {
      console.error('Error al generar gráfico trading:', error)
      return null
    }
  }

  generarGraficoBalance() {
    try {
      const estadisticas = db.getEstadisticasDashboard()

      // Verificar si hay datos
      const total =
        estadisticas.totalIngresos +
        estadisticas.totalGastos +
        estadisticas.totalDebitos +
        estadisticas.totalCreditos

      if (total === 0) {
        return {
          type: 'bar',
          data: {
            labels: ['Balance Financiero'],
            datasets: [
              {
                label: 'Sin datos',
                data: [0],
                backgroundColor: '#e5e7eb',
                barThickness: 50,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { beginAtZero: true, max: 100, ticks: { display: false } },
            },
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
          },
        }
      }

      return {
        type: 'bar',
        data: {
          labels: ['Balance Financiero'],
          datasets: [
            {
              label: 'Ingresos',
              data: [estadisticas.totalIngresos],
              backgroundColor: '#059669',
            },
            {
              label: 'Gastos',
              data: [estadisticas.totalGastos],
              backgroundColor: '#dc2626',
            },
            {
              label: 'Débitos',
              data: [estadisticas.totalDebitos],
              backgroundColor: '#f59e0b',
            },
            {
              label: 'Créditos',
              data: [estadisticas.totalCreditos],
              backgroundColor: '#10b981',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function (value) {
                  return formatCurrency(value)
                },
              },
            },
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function (context) {
                  return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
                },
              },
            },
          },
        },
      }
    } catch (error) {
      console.error('Error al generar gráfico de balance:', error)
      return null
    }
  }

  renderizarGrafico(canvasId, config) {
    try {
      const ctx = document.getElementById(canvasId)
      if (!ctx) return null

      // Destruir gráfico existente si existe
      if (this.charts[canvasId]) {
        this.charts[canvasId].destroy()
      }

      this.charts[canvasId] = new Chart(ctx, config)
      return this.charts[canvasId]
    } catch (error) {
      console.error(`Error al renderizar gráfico ${canvasId}:`, error)
      return null
    }
  }

  async actualizarGraficos() {
    // Gráfico Trading (Dashboard)
    if (document.getElementById('balanceTradingChart')) {
      const configTrading = await this.generarGraficoTrading(window.currentPeriod || '1m')
      if (configTrading) {
        this.renderizarGrafico('balanceTradingChart', configTrading)
      }
    }

    // Gráfico de categorías (Reportes)
    const configCategorias = this.generarGraficoPorCategorias()
    if (configCategorias) {
      this.renderizarGrafico('categoryAnalysisChart', configCategorias)
    }

    // Gráfico de balance (Reportes)
    const configBalance = this.generarGraficoBalance()
    if (configBalance) {
      this.renderizarGrafico('balanceChart', configBalance)
    }

    // Gráfico de tendencias (Reportes)
    const selectorPeriodo = document.getElementById('trendPeriod')
    const meses = selectorPeriodo ? parseInt(selectorPeriodo.value) : 12
    const configTendencias = this.generarGraficoTendencias(meses)
    if (configTendencias) {
      this.renderizarGrafico('trendsChart', configTendencias)
    }
  }

  generarMetricasClave() {
    try {
      const estadisticas = db.getEstadisticasDashboard()
      const topCategorias = movimientosManager.obtenerTopCategorias(1)
      const resumenDeudas = deudasManager.obtenerResumen()

      const metricas = [
        {
          icono: '💰',
          titulo: 'Total Ingresos',
          valor: formatCurrency(estadisticas.totalIngresos),
          clase: 'success',
        },
        {
          icono: '💸',
          titulo: 'Total Gastos',
          valor: formatCurrency(estadisticas.totalGastos),
          clase: 'danger',
        },
        {
          icono: '⚖️',
          titulo: 'Balance General',
          valor: formatCurrency(estadisticas.balanceGeneral),
          clase: estadisticas.balanceGeneral >= 0 ? 'success' : 'danger',
        },
        {
          icono: '💎',
          titulo: 'Balance Real',
          valor: formatCurrency(estadisticas.balanceReal),
          clase: estadisticas.balanceReal >= 0 ? 'success' : 'danger',
        },
      ]

      if (topCategorias.length > 0) {
        metricas.push({
          icono: topCategorias[0].icono || '📊',
          titulo: 'Mayor Gasto',
          valor: topCategorias[0].categoria,
          subtitulo: formatCurrency(topCategorias[0].total),
          clase: 'warning',
        })
      }

      if (resumenDeudas.vencidos > 0) {
        metricas.push({
          icono: '⚠️',
          titulo: 'Deudas Vencidas',
          valor: resumenDeudas.vencidos.toString(),
          clase: 'danger',
        })
      }

      return metricas
    } catch (error) {
      console.error('Error al generar métricas clave:', error)
      return []
    }
  }

  generarColor() {
    const colores = [
      '#ef4444',
      '#f59e0b',
      '#10b981',
      '#3b82f6',
      '#8b5cf6',
      '#ec4899',
      '#06b6d4',
      '#f97316',
      '#84cc16',
      '#6366f1',
    ]
    return colores[Math.floor(Math.random() * colores.length)]
  }

  exportarReporte(formato = 'json') {
    try {
      const reporte = this.generarReporteGeneral()
      const fecha = formatDate(new Date())

      if (formato === 'json') {
        const dataStr = JSON.stringify(reporte, null, 2)
        const blob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        const a = document.createElement('a')
        a.href = url
        a.download = `reporte_mosys_${fecha}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }

      return { success: true }
    } catch (error) {
      console.error('Error al exportar reporte:', error)
      return { success: false, error: error.message }
    }
  }
}

const reportesManager = new ReportesManager()

function llenarMetricasClave() {
  const container = document.getElementById('metricsKey')
  if (!container) return

  const metricas = reportesManager.generarMetricasClave()

  container.innerHTML = ''

  metricas.forEach(metrica => {
    const div = document.createElement('div')
    div.className = `metric-item ${metrica.clase}`
    div.innerHTML = `
            <div class="metric-icon">${metrica.icono}</div>
            <div class="metric-content">
                <h4>${metrica.titulo}</h4>
                <p class="metric-value">${metrica.valor}</p>
                ${metrica.subtitulo ? `<small>${metrica.subtitulo}</small>` : ''}
            </div>
        `
    container.appendChild(div)
  })
}

function actualizarReportes() {
  reportesManager.actualizarGraficos()
  llenarMetricasClave()
}
