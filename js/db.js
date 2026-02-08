/**
 * Mosys - Sistema de Dinero Personal
 * Módulo de Base de Datos SQLite
 *
 * Maneja todas las operaciones de base de datos usando sql.js
 * para SQLite en el navegador
 */

class DatabaseManager {
  constructor() {
    this.db = null
    this.dbName = 'mosys_database'
    this.initialized = false
  }

  /**
   * Inicializa la base de datos SQLite
   */
  async initialize() {
    try {
      console.log('🗄️ Inicializando base de datos SQLite...')

      // Cargar sql.js
      const SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`,
      })

      // Verificar si existe una base de datos guardada
      const savedDb = this.loadFromLocalStorage()

      if (savedDb) {
        this.db = new SQL.Database(savedDb)
        console.log('✅ Base de datos cargada desde localStorage')
        await this.createTables() // Ensure schema is up to date
      } else {
        this.db = new SQL.Database()
        console.log('✅ Nueva base de datos creada')
        await this.createTables()
        await this.insertInitialData()
      }

      this.initialized = true
      this.saveToLocalStorage()

      console.log('🎉 Base de datos inicializada correctamente')
      return true
    } catch (error) {
      console.error('❌ Error al inicializar la base de datos:', error)
      throw error
    }
  }

  /**
   * Crea las tablas del sistema
   */
  async createTables() {
    try {
      console.log('📋 Creando tablas del sistema...')

      // Tabla de movimientos financieros
      const movimientosSQL = `
                CREATE TABLE IF NOT EXISTS movimientos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tipo TEXT NOT NULL CHECK (tipo IN ('Ingreso', 'Gasto')),
                    monto REAL NOT NULL CHECK (monto > 0),
                    categoria TEXT NOT NULL,
                    concepto TEXT NOT NULL,
                    descripcion TEXT,
                    metodo_pago TEXT NOT NULL,
                    fecha TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
            `

      // Tabla de deudas y créditos
      const deudasSQL = `
                CREATE TABLE IF NOT EXISTS deudas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tipo TEXT NOT NULL CHECK (tipo IN ('Débito', 'Crédito')),
                    persona TEXT NOT NULL,
                    monto REAL NOT NULL CHECK (monto > 0),
                    concepto TEXT NOT NULL,
                    fecha_inicio TEXT NOT NULL,
                    fecha_limite TEXT,
                    estado TEXT DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Pagado', 'Vencido')),
                    notas TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
            `

      // Tabla de categorías
      const categoriasSQL = `
                CREATE TABLE IF NOT EXISTS categorias (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL UNIQUE,
                    tipo TEXT NOT NULL CHECK (tipo IN ('Ingreso', 'Gasto', 'Ambos')),
                    icono TEXT,
                    color TEXT,
                    activa INTEGER DEFAULT 1,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
            `

      // Tabla de perfil de usuario (Single Row)
      const perfilSQL = `
                CREATE TABLE IF NOT EXISTS user_profile (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    name TEXT DEFAULT 'USER',
                    email TEXT DEFAULT 'usuario@ejemplo.com',
                    avatar TEXT DEFAULT '',
                    bio TEXT DEFAULT '',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
            `

      // Tabla de configuraciones
      const configuracionesSQL = `
                CREATE TABLE IF NOT EXISTS configuraciones (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    clave TEXT NOT NULL UNIQUE,
                    valor TEXT NOT NULL,
                    descripcion TEXT,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
            `

      // Ejecutar creación de tablas
      this.db.run(movimientosSQL)
      this.db.run(deudasSQL)
      this.db.run(categoriasSQL)
      this.db.run(perfilSQL)
      this.db.run(configuracionesSQL)

      // Inicializar perfil si no existe
      const profileExistsResult = this.db.exec('SELECT count(*) as count FROM user_profile')
      const profileExists =
        profileExistsResult.length > 0 && profileExistsResult[0].values.length > 0
          ? profileExistsResult[0].values[0][0]
          : 0
      if (profileExists === 0) {
        this.db.run(`
                    INSERT INTO user_profile (id, name, email, avatar) 
                    VALUES (1, 'USER', 'admin@mosys.com', 'https://ui-avatars.com/api/?name=USER&background=random')
                `)
      } else {
        // Migration: Fix default name if it's still the old one
        const currentName = this.db.exec('SELECT name FROM user_profile WHERE id = 1')[0]
          .values[0][0]
        if (currentName === 'Dr. Anderson Q.') {
          this.db.run(
            `UPDATE user_profile SET name = 'USER', avatar = 'https://ui-avatars.com/api/?name=USER&background=random' WHERE id = 1`
          )
          this.saveToLocalStorage()
        }
      }

      console.log('✅ Tablas creadas correctamente')
    } catch (error) {
      console.error('❌ Error al crear tablas:', error)
      throw error
    }
  }

  /**
   * Inserta datos iniciales del sistema
   */
  async insertInitialData() {
    try {
      console.log('📦 Insertando datos iniciales...')

      // Categorías por defecto para gastos
      const categoriasGastos = [
        { nombre: 'Alimentación', tipo: 'Gasto', icono: '🍽️', color: '#ef4444' },
        { nombre: 'Transporte', tipo: 'Gasto', icono: '🚗', color: '#f59e0b' },
        { nombre: 'Vivienda', tipo: 'Gasto', icono: '🏠', color: '#8b5cf6' },
        { nombre: 'Salud', tipo: 'Gasto', icono: '⚕️', color: '#10b981' },
        { nombre: 'Educación', tipo: 'Gasto', icono: '📚', color: '#3b82f6' },
        { nombre: 'Entretenimiento', tipo: 'Gasto', icono: '🎬', color: '#ec4899' },
        { nombre: 'Ropa', tipo: 'Gasto', icono: '👕', color: '#06b6d4' },
        { nombre: 'Servicios', tipo: 'Gasto', icono: '⚡', color: '#f97316' },
        { nombre: 'Gastos Varios', tipo: 'Gasto', icono: '📦', color: '#6b7280' },
      ]

      // Categorías por defecto para ingresos
      const categoriasIngresos = [
        { nombre: 'Salario', tipo: 'Ingreso', icono: '💼', color: '#059669' },
        { nombre: 'Freelance', tipo: 'Ingreso', icono: '💻', color: '#0891b2' },
        { nombre: 'Negocio', tipo: 'Ingreso', icono: '🏪', color: '#7c3aed' },
        { nombre: 'Inversiones', tipo: 'Ingreso', icono: '📈', color: '#dc2626' },
        { nombre: 'Bonos', tipo: 'Ingreso', icono: '🎁', color: '#059669' },
        { nombre: 'Ventas', tipo: 'Ingreso', icono: '💰', color: '#0d9488' },
        { nombre: 'Otros Ingresos', tipo: 'Ingreso', icono: '💵', color: '#6366f1' },
      ]

      // Insertar categorías
      const todasCategorias = [...categoriasGastos, ...categoriasIngresos]

      for (const categoria of todasCategorias) {
        const stmt = this.db.prepare(`
                    INSERT INTO categorias (nombre, tipo, icono, color) 
                    VALUES (?, ?, ?, ?)
                `)
        stmt.run([categoria.nombre, categoria.tipo, categoria.icono, categoria.color])
        stmt.free()
      }

      // Configuraciones iniciales
      const configuracionesIniciales = [
        { clave: 'theme', valor: 'light', descripcion: 'Tema de la aplicación' },
        { clave: 'currency', valor: 'PEN', descripcion: 'Moneda predeterminada' },
        { clave: 'date_format', valor: 'DD/MM/YYYY', descripcion: 'Formato de fecha' },
        { clave: 'first_run', valor: 'true', descripcion: 'Primera ejecución de la app' },
      ]

      for (const config of configuracionesIniciales) {
        const stmt = this.db.prepare(`
                    INSERT INTO configuraciones (clave, valor, descripcion) 
                    VALUES (?, ?, ?)
                `)
        stmt.run([config.clave, config.valor, config.descripcion])
        stmt.free()
      }

      console.log('✅ Datos iniciales insertados correctamente')
    } catch (error) {
      console.error('❌ Error al insertar datos iniciales:', error)
      throw error
    }
  }

  /**
   * Ejecuta una consulta SELECT
   */
  select(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql)
      const result = stmt.getAsObject(params)
      stmt.free()
      return result
    } catch (error) {
      console.error('❌ Error en consulta SELECT:', error)
      throw error
    }
  }

  /**
   * Ejecuta una consulta SELECT que devuelve múltiples filas
   */
  selectAll(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql)
      if (params && params.length > 0) {
        stmt.bind(params)
      }

      const results = []

      while (stmt.step()) {
        results.push(stmt.getAsObject())
      }

      stmt.free()
      return results
    } catch (error) {
      console.error('❌ Error en consulta SELECT ALL:', error)
      throw error
    }
  }

  /**
   * Ejecuta una consulta INSERT/UPDATE/DELETE
   */
  run(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql)
      stmt.run(params)
      const result = {
        lastID: this.db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] || null,
        changes: stmt.getColumnNames().length,
      }
      stmt.free()
      this.saveToLocalStorage() // Guardar cambios
      return result
    } catch (error) {
      console.error('❌ Error en consulta RUN:', error)
      throw error
    }
  }

  /**
   * Ejecuta múltiples consultas en una transacción
   */
  transaction(queries) {
    try {
      this.db.run('BEGIN TRANSACTION')

      const results = []
      for (const { sql, params } of queries) {
        const result = this.run(sql, params)
        results.push(result)
      }

      this.db.run('COMMIT')
      this.saveToLocalStorage()
      return results
    } catch (error) {
      this.db.run('ROLLBACK')
      console.error('❌ Error en transacción:', error)
      throw error
    }
  }

  /**
   * Obtiene todas las categorías
   */
  getCategorias(tipo = null) {
    let sql = 'SELECT * FROM categorias WHERE activa = 1'
    const params = []

    if (tipo) {
      sql += ' AND (tipo = ? OR tipo = "Ambos")'
      params.push(tipo)
    }

    sql += ' ORDER BY nombre'
    return this.selectAll(sql, params)
  }

  /**
   * Obtiene una configuración
   */
  getConfiguracion(clave) {
    const sql = 'SELECT valor FROM configuraciones WHERE clave = ?'
    const result = this.select(sql, [clave])
    return result.valor || null
  }

  /**
   * Actualiza una configuración
   */
  setConfiguracion(clave, valor) {
    const sql = `
            INSERT OR REPLACE INTO configuraciones (clave, valor, updated_at) 
            VALUES (?, ?, datetime('now'))
        `
    return this.run(sql, [clave, valor])
  }

  /**
   * Obtiene estadísticas rápidas del dashboard
   */
  getEstadisticasDashboard() {
    try {
      const hoy = new Date()
      const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        .toISOString()
        .split('T')[0]
      const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0]

      // Total ingresos del mes
      const ingresosSQL = `
                SELECT COALESCE(SUM(monto), 0) as total 
                FROM movimientos 
                WHERE tipo = 'Ingreso' 
                AND date(fecha) BETWEEN ? AND ?
            `
      const ingresos = this.select(ingresosSQL, [primerDiaMes, ultimoDiaMes])

      // Total gastos del mes
      const gastosSQL = `
                SELECT COALESCE(SUM(monto), 0) as total 
                FROM movimientos 
                WHERE tipo = 'Gasto' 
                AND date(fecha) BETWEEN ? AND ?
            `
      const gastos = this.select(gastosSQL, [primerDiaMes, ultimoDiaMes])

      // Total débitos pendientes
      const debitosSQL = `
                SELECT COALESCE(SUM(monto), 0) as total 
                FROM deudas 
                WHERE tipo = 'Débito' 
                AND estado = 'Pendiente'
            `
      const debitos = this.select(debitosSQL)

      // Total créditos pendientes
      const creditosSQL = `
                SELECT COALESCE(SUM(monto), 0) as total 
                FROM deudas 
                WHERE tipo = 'Crédito' 
                AND estado = 'Pendiente'
            `
      const creditos = this.select(creditosSQL)

      return {
        totalIngresos: ingresos.total || 0,
        totalGastos: gastos.total || 0,
        balanceGeneral: (ingresos.total || 0) - (gastos.total || 0),
        totalDebitos: debitos.total || 0,
        totalCreditos: creditos.total || 0,
        balanceReal:
          (ingresos.total || 0) -
          (gastos.total || 0) -
          (debitos.total || 0) +
          (creditos.total || 0),
      }
    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error)
      return {
        totalIngresos: 0,
        totalGastos: 0,
        balanceGeneral: 0,
        totalDebitos: 0,
        totalCreditos: 0,
        balanceReal: 0,
      }
    }
  }

  /**
   * Obtiene movimientos recientes
   */
  getMovimientosRecientes(limit = 5) {
    const sql = `
            SELECT m.*, c.icono, c.color 
            FROM movimientos m
            LEFT JOIN categorias c ON m.categoria = c.nombre
            ORDER BY m.fecha DESC, m.id DESC 
            LIMIT ?
        `
    return this.selectAll(sql, [limit])
  }

  /**
   * Guarda la base de datos en localStorage
   */
  saveToLocalStorage() {
    try {
      const data = this.db.export()
      localStorage.setItem(this.dbName, JSON.stringify(Array.from(data)))
    } catch (error) {
      console.error('❌ Error al guardar en localStorage:', error)
    }
  }

  /**
   * Carga la base de datos desde localStorage
   */
  loadFromLocalStorage() {
    try {
      const data = localStorage.getItem(this.dbName)
      if (data) {
        return new Uint8Array(JSON.parse(data))
      }
      return null
    } catch (error) {
      console.error('❌ Error al cargar desde localStorage:', error)
      return null
    }
  }

  async getProfile() {
    try {
      const result = this.db.exec('SELECT * FROM user_profile WHERE id = 1')
      if (result.length > 0 && result[0].values.length > 0) {
        const columns = result[0].columns
        const values = result[0].values[0]
        const profile = {}
        columns.forEach((col, index) => {
          profile[col] = values[index]
        })
        return profile
      }
      return null
    } catch (error) {
      console.error('Error al obtener perfil:', error)
      throw error
    }
  }

  async updateProfile(profileData) {
    try {
      const { name, email, avatar, bio } = profileData
      const query = `
                UPDATE user_profile 
                SET name = ?, email = ?, avatar = ?, bio = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = 1
            `
      this.db.run(query, [name, email, avatar, bio])
      this.saveToLocalStorage()
      return { success: true }
    } catch (error) {
      console.error('Error al actualizar perfil:', error)
      throw error
    }
  }

  /**
   * Exporta la base de datos
   */
  exportDatabase() {
    try {
      const data = this.db.export()
      const blob = new Blob([data], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `mosys_backup_${new Date().toISOString().split('T')[0]}.db`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      return true
    } catch (error) {
      console.error('❌ Error al exportar base de datos:', error)
      return false
    }
  }

  /**
   * Importa una base de datos
   */
  async importDatabase(file) {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const data = new Uint8Array(arrayBuffer)

      // Validar que es una base de datos SQLite válida
      const SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`,
      })

      const testDb = new SQL.Database(data)

      // Verificar que tiene las tablas necesarias
      const tables = testDb.exec("SELECT name FROM sqlite_master WHERE type='table'")
      const tableNames = tables[0]?.values?.flat() || []

      const requiredTables = ['movimientos', 'deudas', 'categorias', 'configuraciones']
      const hasRequiredTables = requiredTables.every(table => tableNames.includes(table))

      if (!hasRequiredTables) {
        throw new Error('El archivo no contiene una base de datos Mosys válida')
      }

      testDb.close()

      // Reemplazar base de datos actual
      this.db.close()
      this.db = new SQL.Database(data)
      this.saveToLocalStorage()

      return true
    } catch (error) {
      console.error('❌ Error al importar base de datos:', error)
      throw error
    }
  }

  /**
   * Limpia toda la base de datos
   */
  clearDatabase() {
    try {
      // Eliminar todas las tablas
      const tables = ['movimientos', 'deudas', 'categorias', 'configuraciones']

      for (const table of tables) {
        this.db.run(`DELETE FROM ${table}`)
      }

      // Recrear datos iniciales
      this.insertInitialData()

      return true
    } catch (error) {
      console.error('❌ Error al limpiar base de datos:', error)
      return false
    }
  }

  /**
   * Cierra la base de datos
   */
  close() {
    if (this.db) {
      this.saveToLocalStorage()
      this.db.close()
      this.db = null
      this.initialized = false
    }
  }

  /**
   * Verifica si la base de datos está inicializada
   */
  isInitialized() {
    return this.initialized && this.db !== null
  }

  /**
   * Obtiene información del estado de la base de datos
   */
  getStatus() {
    if (!this.isInitialized()) {
      return { status: 'disconnected', message: 'Base de datos no inicializada' }
    }

    try {
      // Verificar conectividad ejecutando una consulta simple
      this.db.exec('SELECT 1')

      // Contar registros en tablas principales
      const movimientos = this.select('SELECT COUNT(*) as count FROM movimientos')
      const deudas = this.select('SELECT COUNT(*) as count FROM deudas')

      return {
        status: 'connected',
        message: 'Base de datos operativa',
        records: {
          movimientos: movimientos.count || 0,
          deudas: deudas.count || 0,
        },
      }
    } catch (error) {
      return { status: 'error', message: 'Error en la base de datos', error: error.message }
    }
  }
}

// Instancia global de la base de datos
const db = new DatabaseManager()

// Función de utilidad para formatear fechas (YYYY-MM-DD)
function formatDate(date) {
  if (typeof date === 'string') {
    date = new Date(date)
  }
  // Ajustar a zona horaria local
  const offset = date.getTimezoneOffset() * 60000
  const localDate = new Date(date.getTime() - offset)
  return localDate.toISOString().split('T')[0]
}

// Función de utilidad para formatear fecha y hora (YYYY-MM-DD HH:MM)
function formatDateTime(date) {
  if (typeof date === 'string') {
    date = new Date(date)
  }
  // Ajustar a zona horaria local
  const offset = date.getTimezoneOffset() * 60000
  const localDate = new Date(date.getTime() - offset)
  return localDate.toISOString().replace('T', ' ').slice(0, 16)
}

// Función de utilidad para formatear moneda
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(amount)
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DatabaseManager, db, formatDate, formatDateTime, formatCurrency }
}
