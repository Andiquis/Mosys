/**
 * Mosys - Sistema de Dinero Personal
 * Módulo de Movimientos Financieros
 *
 * Maneja todas las operaciones CRUD para ingresos y gastos
 */

class MovimientosManager {
  constructor() {
    this.currentFilters = {}
    this.currentSort = { column: 'fecha', direction: 'desc' }
  }

  /**
   * Crea un nuevo movimiento financiero
   */
  async crear(movimiento) {
    try {
      // Validar datos
      this.validarMovimiento(movimiento)

      // Preparar datos para inserción
      const fecha = movimiento.fecha || new Date().toISOString().slice(0, 16)

      const sql = `
                INSERT INTO movimientos 
                (tipo, monto, categoria, concepto, descripcion, metodo_pago, fecha, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `

      const params = [
        movimiento.tipo,
        parseFloat(movimiento.monto),
        movimiento.categoria,
        movimiento.concepto,
        movimiento.descripcion || '',
        movimiento.metodo_pago,
        fecha,
      ]

      const result = db.run(sql, params)

      if (result.lastID) {
        console.log('✅ Movimiento creado con ID:', result.lastID)
        return { success: true, id: result.lastID }
      } else {
        throw new Error('No se pudo obtener el ID del movimiento creado')
      }
    } catch (error) {
      console.error('❌ Error al crear movimiento:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Obtiene un movimiento por ID
   */
  obtenerPorId(id) {
    try {
      const sql = `
                SELECT m.*, c.icono, c.color 
                FROM movimientos m
                LEFT JOIN categorias c ON m.categoria = c.nombre
                WHERE m.id = ?
            `
      return db.select(sql, [id])
    } catch (error) {
      console.error('❌ Error al obtener movimiento:', error)
      return null
    }
  }

  /**
   * Obtiene todos los movimientos con filtros opcionales
   */
  obtenerTodos(filtros = {}) {
    try {
      let sql = `
                SELECT m.*, c.icono, c.color 
                FROM movimientos m
                LEFT JOIN categorias c ON m.categoria = c.nombre
                WHERE 1=1
            `
      const params = []

      // Aplicar filtros
      if (filtros.tipo) {
        sql += ' AND m.tipo = ?'
        params.push(filtros.tipo)
      }

      if (filtros.categoria) {
        sql += ' AND m.categoria = ?'
        params.push(filtros.categoria)
      }

      if (filtros.fechaDesde) {
        sql += ' AND date(m.fecha) >= ?'
        params.push(filtros.fechaDesde)
      }

      if (filtros.fechaHasta) {
        sql += ' AND date(m.fecha) <= ?'
        params.push(filtros.fechaHasta)
      }

      if (filtros.montoMin) {
        sql += ' AND m.monto >= ?'
        params.push(parseFloat(filtros.montoMin))
      }

      if (filtros.montoMax) {
        sql += ' AND m.monto <= ?'
        params.push(parseFloat(filtros.montoMax))
      }

      if (filtros.busqueda) {
        sql += ' AND (m.concepto LIKE ? OR m.descripcion LIKE ?)'
        const busqueda = `%${filtros.busqueda}%`
        params.push(busqueda, busqueda)
      }

      // Aplicar ordenamiento
      const sortColumn = filtros.sortColumn || 'fecha'
      const sortDirection = filtros.sortDirection || 'desc'
      sql += ` ORDER BY m.${sortColumn} ${sortDirection.toUpperCase()}, m.id DESC`

      // Aplicar límite si se especifica
      if (filtros.limite) {
        sql += ' LIMIT ?'
        params.push(filtros.limite)
      }

      return db.selectAll(sql, params)
    } catch (error) {
      console.error('❌ Error al obtener movimientos:', error)
      return []
    }
  }

  /**
   * Actualiza un movimiento existente
   */
  async actualizar(id, movimiento) {
    try {
      // Validar datos
      this.validarMovimiento(movimiento)

      const sql = `
                UPDATE movimientos 
                SET tipo = ?, monto = ?, categoria = ?, concepto = ?, 
                    descripcion = ?, metodo_pago = ?, fecha = ?, updated_at = datetime('now')
                WHERE id = ?
            `

      const params = [
        movimiento.tipo,
        parseFloat(movimiento.monto),
        movimiento.categoria,
        movimiento.concepto,
        movimiento.descripcion || '',
        movimiento.metodo_pago,
        movimiento.fecha,
        id,
      ]

      const result = db.run(sql, params)

      console.log('✅ Movimiento actualizado:', id)
      return { success: true }
    } catch (error) {
      console.error('❌ Error al actualizar movimiento:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Elimina un movimiento
   */
  async eliminar(id) {
    try {
      const sql = 'DELETE FROM movimientos WHERE id = ?'
      const result = db.run(sql, [id])

      console.log('✅ Movimiento eliminado:', id)
      return { success: true }
    } catch (error) {
      console.error('❌ Error al eliminar movimiento:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Valida los datos de un movimiento
   */
  validarMovimiento(movimiento) {
    const errores = []

    if (!movimiento.tipo || !['Ingreso', 'Gasto'].includes(movimiento.tipo)) {
      errores.push('El tipo debe ser "Ingreso" o "Gasto"')
    }

    if (
      !movimiento.monto ||
      isNaN(parseFloat(movimiento.monto)) ||
      parseFloat(movimiento.monto) <= 0
    ) {
      errores.push('El monto debe ser un número mayor a 0')
    }

    if (!movimiento.categoria || movimiento.categoria.trim().length === 0) {
      errores.push('La categoría es requerida')
    }

    if (!movimiento.concepto || movimiento.concepto.trim().length === 0) {
      errores.push('El concepto es requerido')
    }

    if (!movimiento.metodo_pago || movimiento.metodo_pago.trim().length === 0) {
      errores.push('El método de pago es requerido')
    }

    if (movimiento.concepto && movimiento.concepto.length > 100) {
      errores.push('El concepto no puede exceder 100 caracteres')
    }

    if (movimiento.descripcion && movimiento.descripcion.length > 500) {
      errores.push('La descripción no puede exceder 500 caracteres')
    }

    if (errores.length > 0) {
      throw new Error(errores.join(', '))
    }
  }

  /**
   * Obtiene estadísticas de movimientos por período
   */
  obtenerEstadisticas(periodo = 'mes') {
    try {
      let fechaDesde, fechaHasta
      const hoy = new Date()

      switch (periodo) {
        case 'dia':
          fechaDesde = fechaHasta = formatDate(hoy)
          break
        case 'semana':
          const inicioSemana = new Date(hoy)
          inicioSemana.setDate(hoy.getDate() - hoy.getDay())
          fechaDesde = formatDate(inicioSemana)
          fechaHasta = formatDate(hoy)
          break
        case 'mes':
          fechaDesde = formatDate(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
          fechaHasta = formatDate(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0))
          break
        case 'año':
          fechaDesde = formatDate(new Date(hoy.getFullYear(), 0, 1))
          fechaHasta = formatDate(new Date(hoy.getFullYear(), 11, 31))
          break
        default:
          fechaDesde = null
          fechaHasta = null
      }

      let sql = `
                SELECT 
                    tipo,
                    COUNT(*) as cantidad,
                    SUM(monto) as total,
                    AVG(monto) as promedio,
                    MIN(monto) as minimo,
                    MAX(monto) as maximo
                FROM movimientos
            `

      const params = []

      if (fechaDesde && fechaHasta) {
        sql += ' WHERE date(fecha) BETWEEN ? AND ?'
        params.push(fechaDesde, fechaHasta)
      }

      sql += ' GROUP BY tipo'

      const resultados = db.selectAll(sql, params)

      const estadisticas = {
        periodo,
        fechaDesde,
        fechaHasta,
        ingresos: { cantidad: 0, total: 0, promedio: 0, minimo: 0, maximo: 0 },
        gastos: { cantidad: 0, total: 0, promedio: 0, minimo: 0, maximo: 0 },
      }

      resultados.forEach(row => {
        const tipo = row.tipo.toLowerCase()
        if (tipo === 'ingreso') {
          estadisticas.ingresos = {
            cantidad: row.cantidad,
            total: row.total,
            promedio: row.promedio,
            minimo: row.minimo,
            maximo: row.maximo,
          }
        } else if (tipo === 'gasto') {
          estadisticas.gastos = {
            cantidad: row.cantidad,
            total: row.total,
            promedio: row.promedio,
            minimo: row.minimo,
            maximo: row.maximo,
          }
        }
      })

      estadisticas.balance = estadisticas.ingresos.total - estadisticas.gastos.total
      estadisticas.totalMovimientos = estadisticas.ingresos.cantidad + estadisticas.gastos.cantidad

      return estadisticas
    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error)
      return null
    }
  }

  /**
   * Obtiene movimientos por categoría
   */
  obtenerPorCategoria(tipo = null) {
    try {
      let sql = `
                SELECT 
                    categoria,
                    COUNT(*) as cantidad,
                    SUM(monto) as total,
                    AVG(monto) as promedio,
                    c.icono,
                    c.color
                FROM movimientos m
                LEFT JOIN categorias c ON m.categoria = c.nombre
            `

      const params = []

      if (tipo) {
        sql += ' WHERE m.tipo = ?'
        params.push(tipo)
      }

      sql += ' GROUP BY categoria ORDER BY total DESC'

      return db.selectAll(sql, params)
    } catch (error) {
      console.error('❌ Error al obtener movimientos por categoría:', error)
      return []
    }
  }

  /**
   * Obtiene el top de categorías con mayor gasto
   */
  obtenerTopCategorias(limite = 5) {
    try {
      const sql = `
                SELECT 
                    categoria,
                    SUM(monto) as total,
                    COUNT(*) as cantidad,
                    c.icono,
                    c.color
                FROM movimientos m
                LEFT JOIN categorias c ON m.categoria = c.nombre
                WHERE m.tipo = 'Gasto'
                GROUP BY categoria
                ORDER BY total DESC
                LIMIT ?
            `

      return db.selectAll(sql, [limite])
    } catch (error) {
      console.error('❌ Error al obtener top categorías:', error)
      return []
    }
  }

  /**
   * Obtiene tendencias mensuales
   */
  obtenerTendencias(meses = 12) {
    try {
      const sql = `
                SELECT 
                    strftime('%Y-%m', fecha) as mes,
                    tipo,
                    SUM(monto) as total,
                    COUNT(*) as cantidad
                FROM movimientos
                WHERE fecha >= date('now', '-${meses} months')
                GROUP BY strftime('%Y-%m', fecha), tipo
                ORDER BY mes ASC
            `

      return db.selectAll(sql)
    } catch (error) {
      console.error('❌ Error al obtener tendencias:', error)
      return []
    }
  }

  /**
   * Obtiene el historial de balance para el gráfico de trading
   */
  obtenerHistorialBalance(periodo = '1m') {
    try {
      let fechaInicio
      const hoy = new Date()
      // Helper para formato local
      const toLocalISO = d => {
        const offset = d.getTimezoneOffset() * 60000
        return new Date(d.getTime() - offset).toISOString().replace('T', ' ').slice(0, 16)
      }
      const toLocalDate = d => {
        const offset = d.getTimezoneOffset() * 60000
        return new Date(d.getTime() - offset).toISOString().split('T')[0]
      }

      let groupBy = ''

      switch (periodo) {
        case '1d': // Últimas 24 horas, agrupado por hora
          fechaInicio = toLocalISO(new Date(hoy.getTime() - 24 * 60 * 60 * 1000))
          groupBy = '%Y-%m-%d %H:00' // Por hora
          break
        case '1m': // Últimos 30 días, agrupado por día
          const d1m = new Date(hoy)
          d1m.setDate(hoy.getDate() - 30)
          fechaInicio = toLocalDate(d1m)
          groupBy = '%Y-%m-%d' // Por día
          break
        case '1y': // Últimos 12 meses, agrupado por mes
          const d1y = new Date(hoy)
          d1y.setMonth(hoy.getMonth() - 12)
          fechaInicio = toLocalDate(d1y)
          groupBy = '%Y-%m' // Por mes
          break
        case 'all': // Todo el historial, agrupado por mes
          fechaInicio = '1970-01-01'
          groupBy = '%Y-%m' // Por mes
          break
        default:
          const dDef = new Date(hoy)
          dDef.setDate(hoy.getDate() - 30)
          fechaInicio = toLocalDate(dDef)
          groupBy = '%Y-%m-%d'
      }

      // 1. Obtener balance inicial antes del periodo
      const sqlInicial = `
                SELECT 
                    COALESCE(SUM(CASE WHEN tipo = 'Ingreso' THEN monto ELSE -monto END), 0) as balance_inicial
                FROM movimientos
                WHERE fecha < ?
            `
      const balanceInicial = db.select(sqlInicial, [fechaInicio]).balance_inicial || 0

      // 2. Obtener movimientos dentro del periodo agrupados
      let sqlMovimientos

      if (periodo === '1d') {
        sqlMovimientos = `
                    SELECT 
                        strftime('${groupBy}', fecha) as fecha_grupo,
                        SUM(CASE WHEN tipo = 'Ingreso' THEN monto ELSE -monto END) as cambio
                    FROM movimientos
                    WHERE fecha >= ?
                    GROUP BY fecha_grupo
                    ORDER BY fecha_grupo ASC
                `
      } else {
        sqlMovimientos = `
                    SELECT 
                        strftime('${groupBy}', fecha) as fecha_grupo,
                        SUM(CASE WHEN tipo = 'Ingreso' THEN monto ELSE -monto END) as cambio
                    FROM movimientos
                    WHERE date(fecha) >= ?
                    GROUP BY fecha_grupo
                    ORDER BY fecha_grupo ASC
                `
      }

      const movimientos = db.selectAll(sqlMovimientos, [fechaInicio])

      // 3. Calcular balance acumulado
      let balanceActual = balanceInicial
      const historial = []

      // Agregar punto inicial (si no es 'all')
      if (periodo !== 'all' && movimientos.length > 0) {
        historial.push({
          fecha: fechaInicio,
          balance: balanceInicial,
        })
      }

      movimientos.forEach(mov => {
        balanceActual += mov.cambio
        historial.push({
          fecha: mov.fecha_grupo,
          balance: balanceActual,
        })
      })

      // Si no hay movimientos en el periodo pero hay balance inicial, mostrar línea plana
      if (movimientos.length === 0 && balanceInicial !== 0) {
        historial.push({
          fecha: fechaInicio,
          balance: balanceInicial,
        })
        historial.push({
          fecha: new Date().toISOString().slice(0, 16),
          balance: balanceInicial,
        })
      }

      return historial
    } catch (error) {
      console.error('❌ Error al obtener historial de balance:', error)
      return []
    }
  }

  /**
   * Busca movimientos por texto
   */
  buscar(texto, limite = 20) {
    try {
      const sql = `
                SELECT m.*, c.icono, c.color 
                FROM movimientos m
                LEFT JOIN categorias c ON m.categoria = c.nombre
                WHERE m.concepto LIKE ? 
                   OR m.descripcion LIKE ? 
                   OR m.categoria LIKE ?
                ORDER BY m.fecha DESC
                LIMIT ?
            `

      const busqueda = `%${texto}%`
      return db.selectAll(sql, [busqueda, busqueda, busqueda, limite])
    } catch (error) {
      console.error('❌ Error al buscar movimientos:', error)
      return []
    }
  }

  /**
   * Obtiene movimientos duplicados
   */
  obtenerDuplicados() {
    try {
      const sql = `
                SELECT 
                    tipo, monto, categoria, concepto, date(fecha) as fecha_sin_hora,
                    COUNT(*) as cantidad,
                    GROUP_CONCAT(id) as ids
                FROM movimientos
                GROUP BY tipo, monto, categoria, concepto, date(fecha)
                HAVING COUNT(*) > 1
                ORDER BY cantidad DESC
            `

      return db.selectAll(sql)
    } catch (error) {
      console.error('❌ Error al obtener duplicados:', error)
      return []
    }
  }

  /**
   * Exporta movimientos a CSV
   */
  exportarCSV(filtros = {}) {
    try {
      const movimientos = this.obtenerTodos(filtros)

      const headers = [
        'ID',
        'Tipo',
        'Monto',
        'Categoría',
        'Concepto',
        'Descripción',
        'Método de Pago',
        'Fecha',
        'Creado',
      ]

      let csv = headers.join(',') + '\n'

      movimientos.forEach(movimiento => {
        const row = [
          movimiento.id,
          `"${movimiento.tipo}"`,
          movimiento.monto,
          `"${movimiento.categoria}"`,
          `"${movimiento.concepto}"`,
          `"${movimiento.descripcion || ''}"`,
          `"${movimiento.metodo_pago}"`,
          `"${movimiento.fecha}"`,
          `"${movimiento.created_at}"`,
        ]
        csv += row.join(',') + '\n'
      })

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      link.setAttribute('href', url)
      link.setAttribute('download', `movimientos_${formatDate(new Date())}.csv`)
      link.style.visibility = 'hidden'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      return { success: true }
    } catch (error) {
      console.error('❌ Error al exportar CSV:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Importa movimientos desde CSV
   */
  async importarCSV(file) {
    try {
      const text = await file.text()
      const lines = text.split('\n')
      const headers = lines[0].split(',')

      const movimientos = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const values = line.split(',')
        if (values.length >= 7) {
          const movimiento = {
            tipo: values[1].replace(/"/g, ''),
            monto: parseFloat(values[2]),
            categoria: values[3].replace(/"/g, ''),
            concepto: values[4].replace(/"/g, ''),
            descripcion: values[5].replace(/"/g, ''),
            metodo_pago: values[6].replace(/"/g, ''),
            fecha: values[7].replace(/"/g, ''),
          }

          movimientos.push(movimiento)
        }
      }

      let exitosos = 0
      let errores = 0

      for (const movimiento of movimientos) {
        const result = await this.crear(movimiento)
        if (result.success) {
          exitosos++
        } else {
          errores++
        }
      }

      return {
        success: true,
        exitosos,
        errores,
        total: movimientos.length,
      }
    } catch (error) {
      console.error('❌ Error al importar CSV:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Elimina movimientos antiguos
   */
  async limpiarAntiguos(mesesAntiguedad = 24) {
    try {
      const sql = `
                DELETE FROM movimientos 
                WHERE fecha < date('now', '-${mesesAntiguedad} months')
            `

      const result = db.run(sql)

      return {
        success: true,
        eliminados: result.changes || 0,
      }
    } catch (error) {
      console.error('❌ Error al limpiar movimientos antiguos:', error)
      return { success: false, error: error.message }
    }
  }
}

// Instancia global del gestor de movimientos
const movimientosManager = new MovimientosManager()

// Funciones de utilidad para la interfaz de usuario
function llenarTablaMovimientos(movimientos) {
  const tbody = document.querySelector('#tablaMovimientos tbody')
  if (!tbody) return

  tbody.innerHTML = ''

  if (movimientos.length === 0) {
    tbody.innerHTML = `
            <tr class="empty-state-row">
                <td colspan="7" class="text-center text-muted">
                    <i class="fas fa-inbox"></i><br>
                    No hay movimientos que mostrar
                </td>
            </tr>
        `
    return
  }

  movimientos.forEach(movimiento => {
    const fecha = new Date(movimiento.fecha).toLocaleDateString()
    const tipoClass = movimiento.tipo.toLowerCase()
    const montoFormateado = formatCurrency(movimiento.monto)

    const row = document.createElement('tr')
    row.innerHTML = `
            <td data-label="Fecha">${fecha}</td>
            <td data-label="Tipo">
                <span class="badge ${tipoClass}">
                    ${movimiento.icono || (movimiento.tipo === 'Ingreso' ? '💰' : '💸')} 
                    ${movimiento.tipo}
                </span>
            </td>
            <td data-label="Categoría">
                <span style="color: ${movimiento.color || 'inherit'}">
                    ${movimiento.categoria}
                </span>
            </td>
            <td data-label="Concepto">${movimiento.concepto}</td>
            <td data-label="Monto" class="font-bold ${tipoClass}">${montoFormateado}</td>
            <td data-label="Método">${movimiento.metodo_pago}</td>
            <td data-label="Acciones">
                <div class="actions-cell">
                    <button class="btn-icon" onclick="editarMovimiento(${movimiento.id})" title="Editar">
                        <i class="fas fa-pen-to-square"></i>
                    </button>
                    <button class="btn-icon danger" onclick="eliminarMovimiento(${movimiento.id})" title="Eliminar">
                        <i class="fas fa-trash-can"></i>
                    </button>
                </div>
            </td>
        `
    tbody.appendChild(row)
  })
}

function cargarCategoriasMovimiento(tipo = '') {
  const select = document.getElementById('categoriaMovimiento')
  if (!select) return

  select.innerHTML = '<option value="">Seleccionar categoría</option>'

  const categorias = db.getCategorias(tipo)
  categorias.forEach(categoria => {
    const option = document.createElement('option')
    option.value = categoria.nombre
    option.textContent = `${categoria.icono || ''} ${categoria.nombre}`
    select.appendChild(option)
  })
}

// Event listeners para el formulario de movimientos
document.addEventListener('DOMContentLoaded', function () {
  // Cambio de tipo en el formulario
  const tipoSelect = document.getElementById('tipoMovimiento')
  if (tipoSelect) {
    tipoSelect.addEventListener('change', function () {
      cargarCategoriasMovimiento(this.value)
    })
  }

  // Fecha actual por defecto
  const fechaInput = document.getElementById('fechaMovimiento')
  if (fechaInput) {
    fechaInput.value = formatDateTime(new Date())
  }

  // Envío del formulario
  const formMovimiento = document.getElementById('formMovimiento')
  if (formMovimiento) {
    formMovimiento.addEventListener('submit', async function (e) {
      e.preventDefault()

      const id = document.getElementById('movimientoId').value

      const movimiento = {
        tipo: document.getElementById('tipoMovimiento').value,
        monto: document.getElementById('montoMovimiento').value,
        categoria: document.getElementById('categoriaMovimiento').value,
        concepto: document.getElementById('conceptoMovimiento').value,
        descripcion: document.getElementById('descripcionMovimiento').value,
        metodo_pago: document.getElementById('metodoMovimiento').value,
        fecha: document.getElementById('fechaMovimiento').value,
      }

      let result
      if (id) {
        // Actualizar
        result = await movimientosManager.actualizar(id, movimiento)
      } else {
        // Crear
        result = await movimientosManager.crear(movimiento)
      }

      if (result.success) {
        mostrarToast(
          id ? 'Movimiento actualizado exitosamente' : 'Movimiento guardado exitosamente',
          'success'
        )
        resetFormMovimiento()
        cargarMovimientos()
        actualizarDashboard()

        // Si se editó, volver a la lista
        if (id && typeof mosysApp !== 'undefined') {
          mosysApp.switchTab(
            document.querySelector('[data-tab="lista-movimientos"]'),
            'lista-movimientos'
          )
        }
      } else {
        mostrarToast(`Error: ${result.error}`, 'error')
      }
    })

    // Listener para el botón de reset
    formMovimiento.addEventListener('reset', function () {
      setTimeout(resetFormMovimiento, 10)
    })
  }
})

function cargarMovimientos() {
  const movimientos = movimientosManager.obtenerTodos()
  llenarTablaMovimientos(movimientos)
}

function editarMovimiento(id) {
  const movimiento = movimientosManager.obtenerPorId(id)
  if (!movimiento) {
    mostrarToast('Movimiento no encontrado', 'error')
    return
  }

  // Cambiar a tab de nuevo movimiento
  if (typeof mosysApp !== 'undefined') {
    mosysApp.switchTab(document.querySelector('[data-tab="nuevo-movimiento"]'), 'nuevo-movimiento')
  }

  // Llenar formulario
  document.getElementById('movimientoId').value = movimiento.id
  document.getElementById('tipoMovimiento').value = movimiento.tipo

  // Cargar categorías correspondientes al tipo
  cargarCategoriasMovimiento(movimiento.tipo)
  document.getElementById('categoriaMovimiento').value = movimiento.categoria

  document.getElementById('montoMovimiento').value = movimiento.monto
  document.getElementById('conceptoMovimiento').value = movimiento.concepto
  document.getElementById('descripcionMovimiento').value = movimiento.descripcion || ''
  document.getElementById('metodoMovimiento').value = movimiento.metodo_pago
  document.getElementById('fechaMovimiento').value = formatDateTime(movimiento.fecha)

  // Actualizar UI
  document.getElementById('formMovimientoTitle').textContent = 'Editar Movimiento'
  const btnSubmit = document.querySelector('#formMovimiento button[type="submit"]')
  if (btnSubmit) {
    btnSubmit.innerHTML = '<i class="fas fa-save"></i> Actualizar Movimiento'
  }
}

// Función para resetear el formulario a estado "Crear"
function resetFormMovimiento() {
  const form = document.getElementById('formMovimiento')
  if (form) form.reset()

  document.getElementById('movimientoId').value = ''
  document.getElementById('formMovimientoTitle').textContent = 'Registrar Nuevo Movimiento'
  document.getElementById('fechaMovimiento').value = formatDateTime(new Date())

  const btnSubmit = document.querySelector('#formMovimiento button[type="submit"]')
  if (btnSubmit) {
    btnSubmit.innerHTML = '<i class="fas fa-save"></i> Guardar Movimiento'
  }
}

function eliminarMovimiento(id) {
  mostrarConfirmacion(
    'Eliminar Movimiento',
    '¿Estás seguro de que deseas eliminar este movimiento?',
    async function () {
      const result = await movimientosManager.eliminar(id)
      if (result.success) {
        mostrarToast('Movimiento eliminado exitosamente', 'success')
        cargarMovimientos()
        actualizarDashboard()
      } else {
        mostrarToast(`Error: ${result.error}`, 'error')
      }
    }
  )
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MovimientosManager, movimientosManager }
}
