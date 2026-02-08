/**
 * Mosys - Sistema de Dinero Personal
 * Módulo de Deudas y Créditos
 */

class DeudasManager {
  constructor() {
    this.currentFilters = {}
  }

  async crear(deuda) {
    try {
      this.validarDeuda(deuda)

      const sql = `
                INSERT INTO deudas 
                (tipo, persona, monto, concepto, fecha_inicio, fecha_limite, estado, notas, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `

      const params = [
        deuda.tipo,
        deuda.persona,
        parseFloat(deuda.monto),
        deuda.concepto,
        deuda.fecha_inicio || formatDate(new Date()),
        deuda.fecha_limite || null,
        deuda.estado || 'Pendiente',
        deuda.notas || '',
      ]

      const result = db.run(sql, params)
      return { success: true, id: result.lastID }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  obtenerPorId(id) {
    const sql = 'SELECT * FROM deudas WHERE id = ?'
    return db.select(sql, [id])
  }

  obtenerTodos(filtros = {}) {
    let sql = 'SELECT * FROM deudas WHERE 1=1'
    const params = []

    if (filtros.tipo) {
      sql += ' AND tipo = ?'
      params.push(filtros.tipo)
    }

    if (filtros.estado) {
      sql += ' AND estado = ?'
      params.push(filtros.estado)
    }

    if (filtros.persona) {
      sql += ' AND persona LIKE ?'
      params.push(`%${filtros.persona}%`)
    }

    sql += ' ORDER BY fecha_inicio DESC'
    return db.selectAll(sql, params)
  }

  async actualizar(id, deuda) {
    try {
      this.validarDeuda(deuda)

      const sql = `
                UPDATE deudas 
                SET tipo = ?, persona = ?, monto = ?, concepto = ?, 
                    fecha_inicio = ?, fecha_limite = ?, estado = ?, notas = ?, updated_at = datetime('now')
                WHERE id = ?
            `

      const params = [
        deuda.tipo,
        deuda.persona,
        parseFloat(deuda.monto),
        deuda.concepto,
        deuda.fecha_inicio,
        deuda.fecha_limite,
        deuda.estado,
        deuda.notas || '',
        id,
      ]

      db.run(sql, params)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async eliminar(id) {
    try {
      db.run('DELETE FROM deudas WHERE id = ?', [id])
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  validarDeuda(deuda) {
    const errores = []

    if (!deuda.tipo || !['Débito', 'Crédito'].includes(deuda.tipo)) {
      errores.push('El tipo debe ser "Débito" o "Crédito"')
    }

    if (!deuda.persona || deuda.persona.trim().length === 0) {
      errores.push('La persona/entidad es requerida')
    }

    if (!deuda.monto || isNaN(parseFloat(deuda.monto)) || parseFloat(deuda.monto) <= 0) {
      errores.push('El monto debe ser un número mayor a 0')
    }

    if (!deuda.concepto || deuda.concepto.trim().length === 0) {
      errores.push('El concepto es requerido')
    }

    if (errores.length > 0) {
      throw new Error(errores.join(', '))
    }
  }

  obtenerResumen() {
    try {
      const debitosSQL = `
                SELECT COALESCE(SUM(monto), 0) as total 
                FROM deudas 
                WHERE tipo = 'Débito' AND estado = 'Pendiente'
            `
      const debitos = db.select(debitosSQL)

      const creditosSQL = `
                SELECT COALESCE(SUM(monto), 0) as total 
                FROM deudas 
                WHERE tipo = 'Crédito' AND estado = 'Pendiente'
            `
      const creditos = db.select(creditosSQL)

      const vencidosSQL = `
                SELECT COUNT(*) as total 
                FROM deudas 
                WHERE estado = 'Pendiente' AND fecha_limite < date('now')
            `
      const vencidos = db.select(vencidosSQL)

      return {
        totalDebitos: debitos.total || 0,
        totalCreditos: creditos.total || 0,
        balance: (creditos.total || 0) - (debitos.total || 0),
        vencidos: vencidos.total || 0,
      }
    } catch (error) {
      console.error('Error al obtener resumen de deudas:', error)
      return { totalDebitos: 0, totalCreditos: 0, balance: 0, vencidos: 0 }
    }
  }

  obtenerVencimientos(dias = 30) {
    const sql = `
            SELECT * FROM deudas 
            WHERE estado = 'Pendiente' 
            AND fecha_limite BETWEEN date('now') AND date('now', '+${dias} days')
            ORDER BY fecha_limite ASC
        `
    return db.selectAll(sql)
  }

  marcarComoPagado(id) {
    try {
      const sql = `UPDATE deudas SET estado = 'Pagado', updated_at = datetime('now') WHERE id = ?`
      db.run(sql, [id])
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

const deudasManager = new DeudasManager()

function llenarTablaDeudas(deudas) {
  const tbody = document.querySelector('#tablaDeudas tbody')
  if (!tbody) return

  tbody.innerHTML = ''

  if (deudas.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted">
                    <i class="fas fa-inbox"></i><br>
                    No hay deudas que mostrar
                </td>
            </tr>
        `
    return
  }

  deudas.forEach(deuda => {
    const fechaInicio = new Date(deuda.fecha_inicio).toLocaleDateString()
    const fechaLimite = deuda.fecha_limite ? new Date(deuda.fecha_limite).toLocaleDateString() : '-'
    const tipoIcon = deuda.tipo === 'Débito' ? '🔴' : '🟢'
    const estadoClass = deuda.estado.toLowerCase().replace('é', 'e')

    const row = document.createElement('tr')
    row.innerHTML = `
            <td><span class="badge ${deuda.tipo.toLowerCase()}">${tipoIcon} ${deuda.tipo}</span></td>
            <td>${deuda.persona}</td>
            <td>${deuda.concepto}</td>
            <td class="font-bold">${formatCurrency(deuda.monto)}</td>
            <td>${fechaInicio}</td>
            <td>${fechaLimite}</td>
            <td><span class="badge ${estadoClass}">${deuda.estado}</span></td>
            <td>
                <button class="btn-icon" onclick="editarDeuda(${deuda.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon success" onclick="marcarPagada(${deuda.id})" title="Marcar como Pagada">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn-icon danger" onclick="eliminarDeuda(${deuda.id})" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `
    tbody.appendChild(row)
  })
}

document.addEventListener('DOMContentLoaded', function () {
  const formDeuda = document.getElementById('formDeuda')
  if (formDeuda) {
    formDeuda.addEventListener('submit', async function (e) {
      e.preventDefault()

      const id = document.getElementById('deudaId').value

      const deuda = {
        tipo: document.getElementById('tipoDeuda').value,
        persona: document.getElementById('personaDeuda').value,
        monto: document.getElementById('montoDeuda').value,
        concepto: document.getElementById('conceptoDeuda').value,
        fecha_inicio: document.getElementById('fechaInicioDeuda').value || formatDate(new Date()),
        fecha_limite: document.getElementById('fechaLimiteDeuda').value,
        estado: document.getElementById('estadoDeuda').value,
        notas: document.getElementById('notasDeuda').value,
      }

      let result
      if (id) {
        // Actualizar
        result = await deudasManager.actualizar(id, deuda)
      } else {
        // Crear
        result = await deudasManager.crear(deuda)
      }

      if (result.success) {
        mostrarToast(
          id ? 'Deuda actualizada exitosamente' : 'Deuda/Crédito guardado exitosamente',
          'success'
        )
        resetFormDeuda()
        cargarDeudas()
        actualizarDashboard()

        // Si se editó, volver a la lista
        if (id && typeof mosysApp !== 'undefined') {
          mosysApp.switchTab(document.querySelector('[data-tab="lista-deudas"]'), 'lista-deudas')
        }
      } else {
        mostrarToast(`Error: ${result.error}`, 'error')
      }
    })

    // Listener para el botón de reset
    formDeuda.addEventListener('reset', function () {
      setTimeout(resetFormDeuda, 10)
    })
  }
})

function cargarDeudas() {
  const deudas = deudasManager.obtenerTodos()
  llenarTablaDeudas(deudas)
}

function editarDeuda(id) {
  const deuda = deudasManager.obtenerPorId(id)
  if (!deuda) {
    mostrarToast('Deuda no encontrada', 'error')
    return
  }

  // Cambiar a tab de nueva deuda
  if (typeof mosysApp !== 'undefined') {
    mosysApp.switchTab(document.querySelector('[data-tab="nueva-deuda"]'), 'nueva-deuda')
  }

  // Llenar formulario
  document.getElementById('deudaId').value = deuda.id
  document.getElementById('tipoDeuda').value = deuda.tipo
  document.getElementById('personaDeuda').value = deuda.persona
  document.getElementById('montoDeuda').value = deuda.monto
  document.getElementById('conceptoDeuda').value = deuda.concepto
  document.getElementById('fechaInicioDeuda').value = formatDate(deuda.fecha_inicio)
  document.getElementById('fechaLimiteDeuda').value = deuda.fecha_limite
    ? formatDate(deuda.fecha_limite)
    : ''
  document.getElementById('estadoDeuda').value = deuda.estado
  document.getElementById('notasDeuda').value = deuda.notas || ''

  // Actualizar UI
  document.getElementById('formDeudaTitle').textContent = 'Editar Deuda/Crédito'
  const btnSubmit = document.querySelector('#formDeuda button[type="submit"]')
  if (btnSubmit) {
    btnSubmit.innerHTML = '<i class="fas fa-save"></i> Actualizar Deuda'
  }
}

// Función para resetear el formulario a estado "Crear"
function resetFormDeuda() {
  const form = document.getElementById('formDeuda')
  if (form) form.reset()

  document.getElementById('deudaId').value = ''
  document.getElementById('formDeudaTitle').textContent = 'Registrar Nueva Deuda/Crédito'
  document.getElementById('fechaInicioDeuda').value = formatDate(new Date())

  const btnSubmit = document.querySelector('#formDeuda button[type="submit"]')
  if (btnSubmit) {
    btnSubmit.innerHTML = '<i class="fas fa-save"></i> Guardar Deuda/Crédito'
  }
}

function eliminarDeuda(id) {
  mostrarConfirmacion(
    'Eliminar Deuda',
    '¿Estás seguro de que deseas eliminar esta deuda/crédito?',
    async function () {
      const result = await deudasManager.eliminar(id)
      if (result.success) {
        mostrarToast('Deuda eliminada exitosamente', 'success')
        cargarDeudas()
        actualizarDashboard()
      } else {
        mostrarToast(`Error: ${result.error}`, 'error')
      }
    }
  )
}

function marcarPagada(id) {
  const result = deudasManager.marcarComoPagado(id)
  if (result.success) {
    mostrarToast('Deuda marcada como pagada', 'success')
    cargarDeudas()
    actualizarDashboard()
  } else {
    mostrarToast(`Error: ${result.error}`, 'error')
  }
}
