/**
 * Mosys - Sistema de Dinero Personal
 * Controlador Principal de la Aplicación
 */

class MosysApp {
  constructor() {
    this.currentSection = 'dashboard'
    this.isNavOpen = false
    this.initialized = false
  }

  /**
   * Inicializa la aplicación
   */
  async init() {
    try {
      console.log('🚀 Iniciando Mosys...')

      // Mostrar pantalla de carga
      this.showLoading()

      // Inicializar base de datos
      await db.initialize()

      // Configurar eventos
      this.setupEventListeners()

      // Cargar datos iniciales
      await this.loadInitialData()

      // Configurar tema
      this.setupTheme()

      // Configurar Capacitor plugins (si está en native app)
      this.setupCapacitor()

      // Ocultar pantalla de carga y mostrar app
      this.hideLoading()

      this.initialized = true
      console.log('✅ Mosys inicializado correctamente')

      mostrarToast('¡Bienvenido a Mosys!', 'success')
    } catch (error) {
      console.error('❌ Error al inicializar Mosys:', error)
      this.showError('Error al inicializar la aplicación: ' + error.message)
    }
  }

  /**
   * Muestra la pantalla de carga
   */
  showLoading() {
    const loading = document.getElementById('loading')
    const app = document.getElementById('app')

    if (loading) loading.style.display = 'flex'
    if (app) app.style.display = 'none'
  }

  /**
   * Oculta la pantalla de carga
   */
  hideLoading() {
    const loading = document.getElementById('loading')
    const app = document.getElementById('app')

    setTimeout(() => {
      if (loading) loading.style.display = 'none'
      if (app) app.style.display = 'flex'
    }, 1000) // Animación de 1 segundo
  }

  /**
   * Muestra un error crítico
   */
  showError(message) {
    const loading = document.getElementById('loading')
    if (loading) {
      loading.innerHTML = `
                <div class="loading-content">
                    <div class="loading-logo">❌</div>
                    <h2>Error</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn-primary">
                        <i class="fas fa-redo"></i> Reintentar
                    </button>
                </div>
            `
    }
  }

  /**
   * Configura todos los event listeners
   */
  setupEventListeners() {
    // Navegación
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', e => {
        const section = e.currentTarget.dataset.section
        this.navigateToSection(section)
      })
    })

    // Botón de menú (móvil)
    const menuBtn = document.getElementById('menuBtn')
    if (menuBtn) {
      menuBtn.addEventListener('click', () => this.toggleNav())
    }

    // Overlay menu (móvil)
    const menuOverlay = document.getElementById('menuOverlay')
    if (menuOverlay) {
      menuOverlay.addEventListener('click', () => this.toggleNav(false))
    }

    // Botón de sincronización
    const syncBtn = document.getElementById('syncBtn')
    if (syncBtn) {
      syncBtn.addEventListener('click', () => this.syncData())
    }

    // Acciones rápidas del dashboard
    document.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const action = e.currentTarget.dataset.action
        this.handleQuickAction(action)
      })
    })

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const tab = e.currentTarget.dataset.tab
        this.switchTab(e.currentTarget, tab)
      })
    })

    // Filtros
    this.setupFilters()
    this.setupDebtFilters()

    // Profile Form
    const profileForm = document.getElementById('profileForm')
    if (profileForm) {
      profileForm.addEventListener('submit', e => this.handleProfileSave(e))
    }

    // File Avatar Upload
    const fileInput = document.getElementById('profileAvatarFile')
    if (fileInput) {
      fileInput.addEventListener('change', e => {
        const file = e.target.files[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = readerEvent => {
            const base64String = readerEvent.target.result
            // Mostrar preview
            const preview = document.getElementById('editAvatarPreview')
            if (preview) preview.src = base64String
            // Guardar temporalmente en el input de URL (o un campo hidden)
            const urlInput = document.getElementById('profileAvatarInput')
            if (urlInput) urlInput.value = base64String
          }
          reader.readAsDataURL(file)
        }
      })
    }

    // Configuraciones
    this.setupConfigurationEvents()

    // Cerrar modales
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
      closeBtn.addEventListener('click', e => {
        this.closeModal(e.target.closest('.modal'))
      })
    })

    // Cerrar modal clickeando fuera
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', e => {
        if (e.target === modal) {
          this.closeModal(modal)
        }
      })
    })

    // Esc para cerrar modales
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal[style*="block"]')
        if (openModal) {
          this.closeModal(openModal)
        }
      }
    })

    // Responsive navigation - Click outside to close
    document.addEventListener('click', e => {
      if (this.isNavOpen && window.innerWidth <= 1024) {
        const nav = document.getElementById('appNav')
        const menuBtn = document.getElementById('menuBtn')
        if (nav && !nav.contains(e.target) && !menuBtn.contains(e.target)) {
          this.toggleNav(false)
        }
      }
    })

    // Botones de periodo gráfico trading
    document.querySelectorAll('.chart-period-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        // Remover active de otros
        document.querySelectorAll('.chart-period-btn').forEach(b => b.classList.remove('active'))
        // Activar actual
        e.target.classList.add('active')

        // Actualizar gráfico
        const period = e.target.dataset.period
        window.currentPeriod = period // Guardar estado global
        reportesManager.actualizarGraficos()
      })
    })

    // Selector de periodo tendencias
    const trendPeriod = document.getElementById('trendPeriod')
    if (trendPeriod) {
      trendPeriod.addEventListener('change', () => {
        reportesManager.actualizarGraficos()
      })
    }
  }

  /**
   * Configura los filtros
   */
  setupFilters() {
    // Filtros de movimientos
    const filtroTipo = document.getElementById('filtroTipo')
    const filtroCategoria = document.getElementById('filtroCategoria')
    const filtroFecha = document.getElementById('filtroFecha')

    ;[filtroTipo, filtroCategoria, filtroFecha].forEach(filter => {
      if (filter) {
        filter.addEventListener('change', () => this.aplicarFiltrosMovimientos())
      }
    })

    // Limpiar filtros movimientos
    const limpiarFiltros = document.getElementById('limpiarFiltros')
    if (limpiarFiltros) {
      limpiarFiltros.addEventListener('click', () => this.limpiarFiltrosMovimientos())
    }
  }

  async loadProfileData() {
    try {
      const profile = await db.getProfile()
      if (profile) {
        // Update Sidebar
        const sName = document.getElementById('sidebarName')
        const sAvatar = document.getElementById('sidebarAvatar')

        if (sName) sName.textContent = profile.name
        if (sAvatar && profile.avatar) sAvatar.src = profile.avatar

        // Update Form
        const fName = document.getElementById('profileName')
        const fEmail = document.getElementById('profileEmail')
        const fAvatar = document.getElementById('profileAvatarInput')
        const fBio = document.getElementById('profileBio')
        const fPreview = document.getElementById('editAvatarPreview')

        if (fName) fName.value = profile.name
        if (fEmail) fEmail.value = profile.email
        if (fAvatar) fAvatar.value = profile.avatar
        if (fBio) fBio.value = profile.bio || ''
        if (fPreview && profile.avatar) fPreview.src = profile.avatar
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  async handleProfileSave(e) {
    e.preventDefault()
    try {
      const profileData = {
        name: document.getElementById('profileName').value,
        email: document.getElementById('profileEmail').value,
        avatar: document.getElementById('profileAvatarInput').value,
        bio: document.getElementById('profileBio').value,
      }

      await db.updateProfile(profileData)
      await db.updateProfile(profileData)
      await this.loadProfileData() // Refresh UI
      mostrarToast('Perfil actualizado correctamente', 'success')
    } catch (error) {
      console.error('Error saving profile:', error)
      mostrarToast('Error al actualizar perfil', 'error')
    }
  }

  setupDebtFilters() {
    // Filtros de deudas
    const filtroTipoDeuda = document.getElementById('filtroTipoDeuda')
    const filtroEstadoDeuda = document.getElementById('filtroEstadoDeuda')

    ;[filtroTipoDeuda, filtroEstadoDeuda].forEach(filter => {
      if (filter) {
        filter.addEventListener('change', () => this.aplicarFiltrosDeudas())
      }
    })

    // Limpiar filtros deudas
    const limpiarFiltrosDeudas = document.getElementById('limpiarFiltrosDeudas')
    if (limpiarFiltrosDeudas) {
      limpiarFiltrosDeudas.addEventListener('click', () => this.limpiarFiltrosDeudas())
    }
  }

  /**
   * Configura eventos de configuración
   */
  setupConfigurationEvents() {
    // Mode toggle (light / dark / auto)
    const modeToggle = document.getElementById('modeToggle')
    if (modeToggle) {
      modeToggle.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.changeMode(btn.dataset.mode)
        })
      })
    }

    // Color scheme grid
    const colorSchemeGrid = document.getElementById('colorSchemeGrid')
    if (colorSchemeGrid) {
      colorSchemeGrid.querySelectorAll('.color-scheme-card').forEach(card => {
        card.addEventListener('click', () => {
          this.changeColorScheme(card.dataset.scheme)
        })
      })
    }

    // Exportar datos
    const exportBtn = document.getElementById('exportData')
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportData())
    }

    // Importar datos
    const importBtn = document.getElementById('importData')
    if (importBtn) {
      importBtn.addEventListener('click', () => this.importData())
    }

    // Limpiar datos
    const clearBtn = document.getElementById('clearData')
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearData())
    }

    // Generar datos demo
    const demoBtn = document.getElementById('generateDemoData')
    if (demoBtn) {
      demoBtn.addEventListener('click', () => this.generateDemoData())
    }
  }

  /**
   * Carga los datos iniciales
   */
  async loadInitialData() {
    try {
      // Cargar categorías en filtros
      this.loadCategoriesInFilters()

      // Actualizar dashboard
      this.updateDashboard()

      // Cargar movimientos
      cargarMovimientos()

      // Cargar deudas
      cargarDeudas()

      // Actualizar reportes
      actualizarReportes()

      // Cargar configuraciones
      await this.loadConfigurations()
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error)
    }
  }

  /**
   * Carga las categorías en los filtros
   */
  loadCategoriesInFilters() {
    const filtroCategoria = document.getElementById('filtroCategoria')
    if (filtroCategoria) {
      const categorias = db.getCategorias()
      categorias.forEach(categoria => {
        const option = document.createElement('option')
        option.value = categoria.nombre
        option.textContent = `${categoria.icono || ''} ${categoria.nombre}`
        filtroCategoria.appendChild(option)
      })
    }
  }

  /**
   * Navega a una sección
   */
  navigateToSection(sectionName) {
    // Ocultar sección actual
    document.querySelectorAll('.content-section').forEach(section => {
      section.classList.remove('active')
    })

    // Mostrar nueva sección
    const newSection = document.getElementById(sectionName)
    if (newSection) {
      newSection.classList.add('active')
    }

    // Actualizar navegación
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active')
    })
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
      item.classList.remove('active')
    })

    document.querySelector(`.nav-item[data-section="${sectionName}"]`)?.classList.add('active')
    document
      .querySelector(`.bottom-nav-item[data-section="${sectionName}"]`)
      ?.classList.add('active')

    this.currentSection = sectionName

    // Actualizar título del header
    const titles = {
      dashboard: 'Dashboard',
      movimientos: 'Movimientos',
      deudas: 'Deudas y Créditos',
      reportes: 'Reportes',
      perfil: 'Mi Perfil',
      configuracion: 'Configuración',
    }
    const pageTitleEl = document.getElementById('pageTitle')
    if (pageTitleEl && titles[sectionName]) {
      pageTitleEl.textContent = titles[sectionName]
    }

    // Cerrar navegación en móvil
    if (window.innerWidth <= 1024) {
      this.toggleNav(false)
    }

    // Scroll al inicio del contenido
    const mainEl = document.querySelector('.app-main')
    if (mainEl) mainEl.scrollTop = 0

    // Cargar datos específicos de la sección
    this.loadSectionData(sectionName)
  }

  /**
   * Carga datos específicos de una sección
   */
  loadSectionData(sectionName) {
    switch (sectionName) {
      case 'dashboard':
        this.updateDashboard()
        actualizarReportes()
        break
      case 'movimientos':
        cargarMovimientos()
        cargarCategoriasMovimiento()
        break
      case 'deudas':
        cargarDeudas()
        break
      case 'reportes':
        actualizarReportes()
        break
      case 'configuracion':
        this.loadConfigurations()
        break
      case 'perfil':
        this.loadProfileData()
        break
    }
  }

  /**
   * Actualiza el dashboard
   */
  updateDashboard() {
    const stats = db.getEstadisticasDashboard()

    // Actualizar tarjetas de balance
    this.updateElement('totalIngresos', formatCurrency(stats.totalIngresos))
    this.updateElement('totalGastos', formatCurrency(stats.totalGastos))
    this.updateElement('balanceGeneral', formatCurrency(stats.balanceGeneral))
    this.updateElement('balanceReal', formatCurrency(stats.balanceReal))

    // Actualizar movimientos recientes
    this.updateRecentTransactions()

    // Cargar perfil
    this.loadProfileData()

    // Actualizar gráficos del dashboard
    setTimeout(() => {
      reportesManager.actualizarGraficos()
    }, 100)
  }

  /**
   * Actualiza los movimientos recientes
   */
  updateRecentTransactions() {
    const container = document.getElementById('recentTransactions')
    if (!container) return

    const movimientos = db.getMovimientosRecientes(5)

    if (movimientos.length === 0) {
      container.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-inbox"></i><br>
                    No hay movimientos recientes
                </div>
            `
      return
    }

    container.innerHTML = movimientos
      .map(
        mov => `
            <div class="transaction-item ${mov.tipo.toLowerCase()}">
                <div class="transaction-info">
                    <div class="transaction-concept">${mov.concepto}</div>
                    <div class="transaction-details">
                        ${mov.categoria} • ${new Date(mov.fecha).toLocaleDateString()}
                    </div>
                </div>
                <div class="transaction-amount ${mov.tipo.toLowerCase()}">
                    ${mov.tipo === 'Ingreso' ? '+' : '-'}${formatCurrency(mov.monto)}
                </div>
            </div>
        `
      )
      .join('')
  }

  /**
   * Maneja las acciones rápidas del dashboard
   */
  handleQuickAction(action) {
    switch (action) {
      case 'nuevo-ingreso':
        this.navigateToSection('movimientos')
        setTimeout(() => {
          this.switchTab(
            document.querySelector('[data-tab="nuevo-movimiento"]'),
            'nuevo-movimiento'
          )
          document.getElementById('tipoMovimiento').value = 'Ingreso'
          cargarCategoriasMovimiento('Ingreso')
        }, 100)
        break
      case 'nuevo-gasto':
        this.navigateToSection('movimientos')
        setTimeout(() => {
          this.switchTab(
            document.querySelector('[data-tab="nuevo-movimiento"]'),
            'nuevo-movimiento'
          )
          document.getElementById('tipoMovimiento').value = 'Gasto'
          cargarCategoriasMovimiento('Gasto')
        }, 100)
        break
      case 'nueva-deuda':
        this.navigateToSection('deudas')
        setTimeout(() => {
          this.switchTab(document.querySelector('[data-tab="nueva-deuda"]'), 'nueva-deuda')
        }, 100)
        break
      case 'ver-reportes':
        this.navigateToSection('reportes')
        break
    }
  }

  /**
   * Cambia entre tabs
   */
  switchTab(tabBtn, tabId) {
    // Remover active de todos los tabs
    tabBtn.parentElement.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active')
    })

    // Activar tab clickeado
    tabBtn.classList.add('active')

    // Ocultar todo el contenido
    const section = tabBtn.closest('.content-section')
    section.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active')
    })

    // Mostrar contenido del tab
    const activeContent = document.getElementById(tabId)
    if (activeContent) {
      activeContent.classList.add('active')
    }
  }

  /**
   * Aplica filtros a los movimientos
   */
  aplicarFiltrosMovimientos() {
    const filtros = {
      tipo: document.getElementById('filtroTipo')?.value || '',
      categoria: document.getElementById('filtroCategoria')?.value || '',
      fecha: document.getElementById('filtroFecha')?.value || '',
    }

    let filtrosDb = {}

    if (filtros.tipo) filtrosDb.tipo = filtros.tipo
    if (filtros.categoria) filtrosDb.categoria = filtros.categoria

    // Procesar filtro de fecha
    if (filtros.fecha) {
      const hoy = new Date()
      let fechaDesde, fechaHasta

      switch (filtros.fecha) {
        case 'hoy':
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
      }

      if (fechaDesde) filtrosDb.fechaDesde = fechaDesde
      if (fechaHasta) filtrosDb.fechaHasta = fechaHasta
    }

    const movimientos = movimientosManager.obtenerTodos(filtrosDb)
    llenarTablaMovimientos(movimientos)
  }

  /**
   * Limpia los filtros de movimientos
   */
  limpiarFiltrosMovimientos() {
    document.getElementById('filtroTipo').value = ''
    document.getElementById('filtroCategoria').value = ''
    document.getElementById('filtroFecha').value = ''
    cargarMovimientos()
  }

  /**
   * Aplica filtros a las deudas
   */
  aplicarFiltrosDeudas() {
    const filtros = {
      tipo: document.getElementById('filtroTipoDeuda')?.value || '',
      estado: document.getElementById('filtroEstadoDeuda')?.value || '',
    }

    const deudas = deudasManager.obtenerTodos(filtros)
    llenarTablaDeudas(deudas)
  }

  /**
   * Limpia los filtros de deudas
   */
  limpiarFiltrosDeudas() {
    document.getElementById('filtroTipoDeuda').value = ''
    document.getElementById('filtroEstadoDeuda').value = ''
    cargarDeudas()
  }

  /**
   * Toggle navegación móvil
   */
  toggleNav(forceState = null) {
    const nav = document.getElementById('appNav')
    const overlay = document.getElementById('menuOverlay')

    if (nav) {
      if (forceState !== null) {
        if (forceState) {
          nav.classList.add('active')
          if (overlay) overlay.classList.add('active')
        } else {
          nav.classList.remove('active')
          if (overlay) overlay.classList.remove('active')
        }
      } else {
        nav.classList.toggle('active')
        if (overlay) overlay.classList.toggle('active')
      }
    }
  }

  /**
   * Sincroniza datos
   */
  async syncData() {
    try {
      const syncBtn = document.getElementById('syncBtn')
      const icon = syncBtn.querySelector('i')

      // Animación de sincronización
      icon.classList.add('fa-spin')

      // Guardar en localStorage
      db.saveToLocalStorage()

      // Actualizar datos
      this.updateDashboard()

      setTimeout(() => {
        icon.classList.remove('fa-spin')
        mostrarToast('Datos sincronizados correctamente', 'success')
      }, 1000)
    } catch (error) {
      console.error('Error al sincronizar:', error)
      mostrarToast('Error al sincronizar datos', 'error')
    }
  }

  /**
   * Configuración del tema
   */
  setupTheme() {
    const savedMode = db.getConfiguracion('theme') || 'light'
    const savedScheme = db.getConfiguracion('colorScheme') || 'ocean'
    this.applyMode(savedMode)
    this.applyColorScheme(savedScheme)
    this.updateModeToggleUI(savedMode)
    this.updateColorSchemeUI(savedScheme)

    // Listen for system dark mode changes when mode is 'auto'
    this._mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    this._mediaQuery.addEventListener('change', () => {
      const currentMode = db.getConfiguracion('theme') || 'light'
      if (currentMode === 'auto') {
        this.applyMode('auto')
      }
    })
  }

  /**
   * Configura plugins nativos de Capacitor (StatusBar, SplashScreen)
   */
  async setupCapacitor() {
    try {
      // Detect if running inside Capacitor native shell
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        console.log('📱 Running in Capacitor native app')

        // Add class to body for native-specific CSS tweaks
        document.body.classList.add('capacitor-native')

        // StatusBar
        if (window.Capacitor.Plugins.StatusBar) {
          const { StatusBar } = window.Capacitor.Plugins
          try {
            await StatusBar.setBackgroundColor({ color: '#0f172a' })
            await StatusBar.setStyle({ style: 'DARK' })
            await StatusBar.setOverlaysWebView({ overlay: false })
          } catch (e) {
            console.warn('StatusBar plugin error:', e)
          }
        }

        // SplashScreen — hide after init
        if (window.Capacitor.Plugins.SplashScreen) {
          const { SplashScreen } = window.Capacitor.Plugins
          try {
            await SplashScreen.hide()
          } catch (e) {
            console.warn('SplashScreen plugin error:', e)
          }
        }

        // Disable pull-to-refresh in WebView
        document.body.style.overscrollBehavior = 'none'
      }
    } catch (e) {
      console.warn('Capacitor setup skipped (not native):', e)
    }
  }

  changeMode(mode) {
    this.applyMode(mode)
    this.updateModeToggleUI(mode)
    db.setConfiguracion('theme', mode)
    const labels = { light: 'Claro', dark: 'Oscuro', auto: 'Automático' }
    mostrarToast(`Modo ${labels[mode] || mode}`, 'info')
  }

  applyMode(mode) {
    if (mode === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    } else {
      document.documentElement.setAttribute('data-theme', mode)
    }
  }

  updateModeToggleUI(mode) {
    const modeToggle = document.getElementById('modeToggle')
    if (!modeToggle) return
    modeToggle.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode)
    })
  }

  changeColorScheme(scheme) {
    this.applyColorScheme(scheme)
    this.updateColorSchemeUI(scheme)
    db.setConfiguracion('colorScheme', scheme)
    const labels = {
      ocean: 'Océano',
      emerald: 'Esmeralda',
      slate: 'Grafito',
      sunset: 'Atardecer',
      violet: 'Violeta',
      rose: 'Rosa',
    }
    mostrarToast(`Tema ${labels[scheme] || scheme}`, 'info')
  }

  applyColorScheme(scheme) {
    document.documentElement.setAttribute('data-color-scheme', scheme)
  }

  updateColorSchemeUI(scheme) {
    const grid = document.getElementById('colorSchemeGrid')
    if (!grid) return
    grid.querySelectorAll('.color-scheme-card').forEach(card => {
      card.classList.toggle('active', card.dataset.scheme === scheme)
    })
  }

  /**
   * Exportar datos
   */
  exportData() {
    try {
      const success = db.exportDatabase()
      if (success) {
        mostrarToast('Datos exportados exitosamente', 'success')
      } else {
        mostrarToast('Error al exportar datos', 'error')
      }
    } catch (error) {
      console.error('Error al exportar:', error)
      mostrarToast('Error al exportar datos', 'error')
    }
  }

  /**
   * Importar datos
   */
  importData() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.db'
    input.onchange = async e => {
      const file = e.target.files[0]
      if (file) {
        try {
          const success = await db.importDatabase(file)
          if (success) {
            mostrarToast('Datos importados exitosamente', 'success')
            await this.loadInitialData()
          }
        } catch (error) {
          mostrarToast(`Error al importar: ${error.message}`, 'error')
        }
      }
    }
    input.click()
  }

  /**
   * Limpiar datos
   */
  clearData() {
    mostrarConfirmacion(
      'Limpiar Base de Datos',
      '⚠️ ADVERTENCIA: Esta acción eliminará TODOS los datos de la aplicación y no se puede deshacer. ¿Estás completamente seguro?',
      () => {
        const success = db.clearDatabase()
        if (success) {
          mostrarToast('Base de datos limpiada exitosamente', 'success')
          this.loadInitialData()
        } else {
          mostrarToast('Error al limpiar base de datos', 'error')
        }
      }
    )
  }

  /**
   * Generar datos de prueba
   */
  async generateDemoData() {
    try {
      this.showLoading()

      const categoriasIngreso = ['Salario', 'Freelance', 'Negocio', 'Inversiones']
      const categoriasGasto = ['Alimentación', 'Transporte', 'Vivienda', 'Entretenimiento', 'Salud']
      const metodos = ['Efectivo', 'Tarjeta Débito', 'Transferencia']

      // Generar 100 movimientos en el último año
      const hoy = new Date()
      let count = 0

      for (let i = 0; i < 150; i++) {
        const esIngreso = Math.random() > 0.6 // 40% ingresos, 60% gastos
        const diasAtras = Math.floor(Math.random() * 365)

        const fecha = new Date(hoy)
        fecha.setDate(hoy.getDate() - diasAtras)
        fecha.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60))

        const monto = esIngreso
          ? Math.floor(Math.random() * 2000) + 500 // Ingresos 500-2500
          : Math.floor(Math.random() * 200) + 10 // Gastos 10-210

        const categoria = esIngreso
          ? categoriasIngreso[Math.floor(Math.random() * categoriasIngreso.length)]
          : categoriasGasto[Math.floor(Math.random() * categoriasGasto.length)]

        const movimiento = {
          tipo: esIngreso ? 'Ingreso' : 'Gasto',
          monto: monto,
          categoria: categoria,
          concepto: `Movimiento de prueba ${i + 1}`,
          descripcion: 'Generado automáticamente',
          metodo_pago: metodos[Math.floor(Math.random() * metodos.length)],
          fecha: formatDateTime(fecha),
        }

        await movimientosManager.crear(movimiento)
        count++
      }

      this.hideLoading()
      mostrarToast(`¡${count} movimientos generados!`, 'success')
      await this.loadInitialData()
    } catch (error) {
      this.hideLoading()
      console.error(error)
      mostrarToast('Error al generar datos demo', 'error')
    }
  }

  /**
   * Carga configuraciones
   */
  async loadConfigurations() {
    // Actualizar estado de la BD
    const status = db.getStatus()
    const dbStatusEl = document.getElementById('dbStatus')
    if (dbStatusEl) {
      dbStatusEl.textContent = status.message
      dbStatusEl.className = status.status === 'connected' ? 'text-success' : 'text-danger'
    }
  }

  /**
   * Utility: Actualiza un elemento
   */
  updateElement(id, value) {
    const element = document.getElementById(id)
    if (element) {
      element.textContent = value
    }
  }

  /**
   * Muestra/oculta modal
   */
  showModal(modalId) {
    const modal = document.getElementById(modalId)
    if (modal) {
      modal.style.display = 'block'
    }
  }

  closeModal(modal) {
    if (modal) {
      modal.style.display = 'none'
    }
  }
}

// Variables globales
let mosysApp

// Funciones utilitarias globales
function mostrarToast(mensaje, tipo = 'info') {
  const container = document.getElementById('toastContainer')
  if (!container) return

  const iconos = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle',
  }

  const toast = document.createElement('div')
  toast.className = `toast ${tipo}`
  toast.innerHTML = `
        <i class="toast-icon ${iconos[tipo]}"></i>
        <span class="toast-message">${mensaje}</span>
        <i class="toast-close fas fa-times"></i>
    `

  // Event listener para cerrar
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove()
  })

  container.appendChild(toast)

  // Auto-remover después de 5 segundos
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove()
    }
  }, 5000)
}

function mostrarConfirmacion(titulo, mensaje, onConfirm) {
  const modal = document.getElementById('confirmModal')
  const titleEl = document.getElementById('confirmTitle')
  const messageEl = document.getElementById('confirmMessage')
  const yesBtn = document.getElementById('confirmYes')
  const noBtn = document.getElementById('confirmNo')

  if (titleEl) titleEl.textContent = titulo
  if (messageEl) messageEl.textContent = mensaje

  // Limpiar event listeners anteriores
  const newYesBtn = yesBtn.cloneNode(true)
  const newNoBtn = noBtn.cloneNode(true)
  yesBtn.parentNode.replaceChild(newYesBtn, yesBtn)
  noBtn.parentNode.replaceChild(newNoBtn, noBtn)

  // Nuevos event listeners
  newYesBtn.addEventListener('click', () => {
    onConfirm()
    mosysApp.closeModal(modal)
  })

  newNoBtn.addEventListener('click', () => {
    mosysApp.closeModal(modal)
  })

  mosysApp.showModal('confirmModal')
}

// Alias para compatibilidad
window.actualizarDashboard = () => mosysApp.updateDashboard()

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async function () {
  mosysApp = new MosysApp()
  window.app = mosysApp // Expose as 'app' for HTML onclick handlers
  await mosysApp.init()
})

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MosysApp }
}
