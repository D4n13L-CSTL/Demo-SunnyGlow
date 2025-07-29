class BeautyInventory {
  constructor() {
    this.products = JSON.parse(localStorage.getItem("beautyProducts")) || []
    this.sales = JSON.parse(localStorage.getItem("beautySales")) || []
    this.botConfig = JSON.parse(localStorage.getItem("botConfig")) || {
      token: "",
      welcomeMessage: "¡Hola! 👋 Bienvenida a nuestra tienda de cosméticos. ¿En qué puedo ayudarte hoy?",
      autoConfirmOrders: true,
    }
    this.init()
    this.startBotSimulation()
  }

  init() {
    this.setupEventListeners()
    this.updateStats()
    this.renderInventory()
    this.renderSalesHistory()
    this.populateSaleProductSelect()
    this.loadBotConfig()
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.switchTab(e.target.dataset.tab)
      })
    })

    // Product form
    document.getElementById("productForm").addEventListener("submit", (e) => {
      e.preventDefault()
      this.addProduct()
    })

    // Sale form
    document.getElementById("saleForm").addEventListener("submit", (e) => {
      e.preventDefault()
      this.recordSale()
    })

    // Bot config form
    document.getElementById("botConfigForm").addEventListener("submit", (e) => {
      e.preventDefault()
      this.saveBotConfig()
    })

    // Search functionality
    document.getElementById("searchInput").addEventListener("input", (e) => {
      this.searchProducts(e.target.value)
    })

    // Filter sales history
    document.getElementById("filterPeriod").addEventListener("change", (e) => {
      this.filterSalesHistory()
    })

    document
      .getElementById("filterSource")
      .addEventListener("change", (e) => {
        this.filterSalesHistory()
      })

    // Real-time profit calculation
    ;["productCost", "productPrice", "productQuantity"].forEach((id) => {
      document.getElementById(id).addEventListener("input", () => {
        this.calculateProfit()
      })
    })

    // Sale product selection
    document.getElementById("saleProduct").addEventListener("change", (e) => {
      this.updateSalePrice(e.target.value)
    })

    // Modal close
    document.getElementById("modalClose").addEventListener("click", () => {
      this.closeModal()
    })

    // Close modal on outside click
    document.getElementById("successModal").addEventListener("click", (e) => {
      if (e.target.id === "successModal") {
        this.closeModal()
      }
    })
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active")
    })
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active")

    // Update tab content
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.remove("active")
    })
    document.getElementById(tabName).classList.add("active")
  }

  addProduct() {
    const formData = {
      id: Date.now(),
      name: document.getElementById("productName").value || "",
      cost: Number.parseFloat(document.getElementById("productCost").value) || 0,
      price: Number.parseFloat(document.getElementById("productPrice").value) || 0,
      quantity: Number.parseInt(document.getElementById("productQuantity").value) || 0,
      category: document.getElementById("productCategory").value || "otros",
      description: document.getElementById("productDescription").value || "",
      availableInBot: document.getElementById("availableInBot").checked,
      dateAdded: new Date().toISOString(),
    }

    this.products.push(formData)
    this.saveData()
    this.updateStats()
    this.renderInventory()
    this.populateSaleProductSelect()

    // Reset form
    document.getElementById("productForm").reset()
    document.getElementById("availableInBot").checked = true
    this.calculateProfit()

    this.showModal("¡Producto Agregado!", `${formData.name} ha sido agregado exitosamente al inventario.`)
  }

  recordSale(source = "manual", customerInfo = {}) {
    let productId, quantity, salePrice, customerName

    if (source === "manual") {
      productId = Number.parseInt(document.getElementById("saleProduct").value)
      quantity = Number.parseInt(document.getElementById("saleQuantity").value)
      salePrice = Number.parseFloat(document.getElementById("salePrice").value)
      customerName = document.getElementById("customerName").value || "Cliente anónimo"
    } else {
      // Bot sale
      productId = customerInfo.productId
      quantity = customerInfo.quantity
      salePrice = customerInfo.salePrice
      customerName = customerInfo.customerName || "Cliente Telegram"
    }

    const product = this.products.find((p) => p.id === productId)

    if (!product) {
      if (source === "manual") alert("Producto no encontrado")
      return false
    }

    if (quantity > product.quantity) {
      if (source === "manual") alert("No hay suficiente stock disponible")
      return false
    }

    // Update product quantity
    product.quantity -= quantity

    // Record sale
    const sale = {
      id: Date.now(),
      productId: productId,
      productName: product.name,
      quantity: quantity,
      unitCost: product.cost,
      unitPrice: salePrice,
      totalAmount: salePrice * quantity,
      profit: (salePrice - product.cost) * quantity,
      customerName: customerName,
      source: source,
      telegramUserId: customerInfo.telegramUserId || null,
      date: new Date().toISOString(),
    }

    this.sales.push(sale)
    this.saveData()
    this.updateStats()
    this.renderInventory()
    this.renderSalesHistory()
    this.populateSaleProductSelect()

    if (source === "manual") {
      // Reset form
      document.getElementById("saleForm").reset()
      this.showModal(
        "¡Venta Registrada!",
        `Venta de ${quantity} ${product.name} por $${(salePrice * quantity).toFixed(2)} registrada exitosamente.`,
      )
    }

    return true
  }

  deleteProduct(productId) {
    if (confirm("¿Estás segura de que quieres eliminar este producto?")) {
      this.products = this.products.filter((p) => p.id !== productId)
      this.saveData()
      this.updateStats()
      this.renderInventory()
      this.populateSaleProductSelect()
      this.showModal("¡Producto Eliminado!", "El producto ha sido eliminado del inventario.")
    }
  }

  updateStats() {
    const totalProducts = this.products.reduce((sum, product) => sum + (product.quantity || 0), 0)
    const totalInvestment = this.products.reduce(
      (sum, product) => sum + (product.cost || 0) * (product.quantity || 0),
      0,
    )
    const totalSales = this.sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0)
    const botSales = this.sales
      .filter((sale) => sale.source === "bot")
      .reduce((sum, sale) => sum + (sale.totalAmount || 0), 0)

    document.getElementById("totalProducts").textContent = totalProducts
    document.getElementById("totalInvestment").textContent = `$${totalInvestment.toFixed(2)}`
    document.getElementById("totalSales").textContent = `$${totalSales.toFixed(2)}`
    document.getElementById("botSales").textContent = `$${botSales.toFixed(2)}`

    // Update bot stats
    const today = new Date().toDateString()
    const todayBotSales = this.sales
      .filter((sale) => sale.source === "bot" && new Date(sale.date).toDateString() === today)
      .reduce((sum, sale) => sum + (sale.totalAmount || 0), 0)

    document.getElementById("todayBotSales").textContent = `$${todayBotSales.toFixed(2)}`
  }

  renderInventory() {
    const container = document.getElementById("inventoryGrid")

    if (this.products.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h3>No hay productos en el inventario</h3>
                    <p>Agrega tu primer producto para comenzar</p>
                </div>
            `
      return
    }

    container.innerHTML = this.products
      .map(
        (product) => `
            <div class="product-card" data-category="${product.category}">
                <div class="product-header">
                    <div>
                        <div class="product-name">${product.name}</div>
                        <div class="product-category">${this.getCategoryName(product.category)}</div>
                        ${product.availableInBot ? '<div class="bot-available"><i class="fab fa-telegram"></i> Bot</div>' : ""}
                    </div>
                </div>
                <div class="product-details">
                    <div class="detail-item">
                        <div class="detail-label">Costo</div>
                        <div class="detail-value">$${(product.cost || 0).toFixed(2)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Precio</div>
                        <div class="detail-value">$${(product.price || 0).toFixed(2)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Stock</div>
                        <div class="detail-value">${product.quantity || 0}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Ganancia</div>
                        <div class="detail-value">$${((product.price || 0) - (product.cost || 0)).toFixed(2)}</div>
                    </div>
                </div>
                <div class="product-actions">
                    <button class="action-btn sell-btn" onclick="inventory.quickSell(${product.id})">
                        <i class="fas fa-shopping-cart"></i>
                        Vender
                    </button>
                    <button class="action-btn delete-btn" onclick="inventory.deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i>
                        Eliminar
                    </button>
                </div>
            </div>
        `,
      )
      .join("")
  }

  renderSalesHistory() {
    const container = document.getElementById("historyContainer")

    if (this.sales.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <h3>No hay ventas registradas</h3>
                    <p>Las ventas aparecerán aquí una vez que registres la primera</p>
                </div>
            `
      return
    }

    const sortedSales = [...this.sales].sort((a, b) => new Date(b.date) - new Date(a.date))

    container.innerHTML = sortedSales
      .map(
        (sale) => `
            <div class="history-item ${sale.source === "bot" ? "bot-sale" : ""}">
                <div class="sale-source">
                    ${sale.source === "bot" ? '<i class="fab fa-telegram"></i> Bot' : '<i class="fas fa-user"></i> Manual'}
                </div>
                <div class="history-info">
                    <h4>${sale.productName}</h4>
                    <div class="history-details">
                        ${sale.customerName} • ${sale.quantity} unidades • ${this.formatDate(sale.date)}
                    </div>
                </div>
                <div class="history-amount">
                    <div class="sale-amount">$${sale.totalAmount.toFixed(2)}</div>
                    <div class="sale-profit">Ganancia: $${sale.profit.toFixed(2)}</div>
                </div>
            </div>
        `,
      )
      .join("")
  }

  populateSaleProductSelect() {
    const select = document.getElementById("saleProduct")
    const availableProducts = this.products.filter((p) => p.quantity > 0)

    select.innerHTML =
      '<option value="">Seleccionar producto</option>' +
      availableProducts
        .map((product) => `<option value="${product.id}">${product.name} (Stock: ${product.quantity})</option>`)
        .join("")
  }

  updateSalePrice(productId) {
    if (!productId) return

    const product = this.products.find((p) => p.id === Number.parseInt(productId))
    if (product) {
      document.getElementById("salePrice").value = product.price.toFixed(2)
      document.getElementById("saleQuantity").max = product.quantity
    }
  }

  quickSell(productId) {
    const product = this.products.find((p) => p.id === productId)
    if (!product || product.quantity === 0) {
      alert("Producto no disponible para venta")
      return
    }

    // Switch to sales tab and pre-fill form
    this.switchTab("sales")
    document.getElementById("saleProduct").value = productId
    this.updateSalePrice(productId)
    document.getElementById("saleQuantity").value = 1
    document.getElementById("saleQuantity").focus()
  }

  searchProducts(query) {
    const cards = document.querySelectorAll(".product-card")
    const searchTerm = query.toLowerCase()

    cards.forEach((card) => {
      const productName = card.querySelector(".product-name").textContent.toLowerCase()
      const category = card.querySelector(".product-category").textContent.toLowerCase()

      if (productName.includes(searchTerm) || category.includes(searchTerm)) {
        card.style.display = "block"
      } else {
        card.style.display = "none"
      }
    })
  }

  filterSalesHistory() {
    const period = document.getElementById("filterPeriod").value
    const source = document.getElementById("filterSource").value
    const now = new Date()
    let filteredSales = [...this.sales]

    // Filter by period
    switch (period) {
      case "today":
        filteredSales = filteredSales.filter((sale) => {
          const saleDate = new Date(sale.date)
          return saleDate.toDateString() === now.toDateString()
        })
        break
      case "week":
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filteredSales = filteredSales.filter((sale) => new Date(sale.date) >= weekAgo)
        break
      case "month":
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        filteredSales = filteredSales.filter((sale) => new Date(sale.date) >= monthAgo)
        break
    }

    // Filter by source
    if (source !== "all") {
      filteredSales = filteredSales.filter((sale) => sale.source === source)
    }

    this.renderFilteredSalesHistory(filteredSales)
  }

  renderFilteredSalesHistory(sales) {
    const container = document.getElementById("historyContainer")

    if (sales.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h3>No hay ventas en este período</h3>
                    <p>Intenta con un rango de fechas diferente</p>
                </div>
            `
      return
    }

    const sortedSales = sales.sort((a, b) => new Date(b.date) - new Date(a.date))

    container.innerHTML = sortedSales
      .map(
        (sale) => `
            <div class="history-item ${sale.source === "bot" ? "bot-sale" : ""}">
                <div class="sale-source">
                    ${sale.source === "bot" ? '<i class="fab fa-telegram"></i> Bot' : '<i class="fas fa-user"></i> Manual'}
                </div>
                <div class="history-info">
                    <h4>${sale.productName}</h4>
                    <div class="history-details">
                        ${sale.customerName} • ${sale.quantity} unidades • ${this.formatDate(sale.date)}
                    </div>
                </div>
                <div class="history-amount">
                    <div class="sale-amount">$${sale.totalAmount.toFixed(2)}</div>
                    <div class="sale-profit">Ganancia: $${sale.profit.toFixed(2)}</div>
                </div>
            </div>
        `,
      )
      .join("")
  }

  calculateProfit() {
    const cost = Number.parseFloat(document.getElementById("productCost").value) || 0
    const price = Number.parseFloat(document.getElementById("productPrice").value) || 0
    const quantity = Number.parseInt(document.getElementById("productQuantity").value) || 0

    const unitProfit = price - cost
    const totalInvestment = cost * quantity
    const potentialProfit = unitProfit * quantity

    document.getElementById("unitProfit").textContent = `$${unitProfit.toFixed(2)}`
    document.getElementById("totalInvestmentDisplay").textContent = `$${totalInvestment.toFixed(2)}`
    document.getElementById("potentialProfit").textContent = `$${potentialProfit.toFixed(2)}`
  }

  loadBotConfig() {
    document.getElementById("botToken").value = this.botConfig.token
    document.getElementById("welcomeMessage").value = this.botConfig.welcomeMessage
    document.getElementById("autoConfirmOrders").checked = this.botConfig.autoConfirmOrders

    // Update bot status display
    document.getElementById("botTokenDisplay").textContent = this.botConfig.token
      ? `${this.botConfig.token.substring(0, 10)}...`
      : "No configurado"

    const statusElement = document.getElementById("botStatus")
    if (this.botConfig.token) {
      statusElement.textContent = "Conectado"
      statusElement.classList.add("connected")
    } else {
      statusElement.textContent = "Desconectado"
      statusElement.classList.remove("connected")
    }
  }

  saveBotConfig() {
    this.botConfig = {
      token: document.getElementById("botToken").value,
      welcomeMessage: document.getElementById("welcomeMessage").value,
      autoConfirmOrders: document.getElementById("autoConfirmOrders").checked,
    }

    localStorage.setItem("botConfig", JSON.stringify(this.botConfig))
    this.loadBotConfig()
    this.showModal("¡Configuración Guardada!", "La configuración del bot ha sido guardada exitosamente.")
  }

  // Simulate bot sales for demonstration
  startBotSimulation() {
    if (!this.botConfig.token) return

    // Simulate a bot sale every 30 seconds to 2 minutes
    setInterval(
      () => {
        this.simulateBotSale()
      },
      Math.random() * 90000 + 30000,
    ) // 30s to 2min
  }

  simulateBotSale() {
    const availableProducts = this.products.filter((p) => p.availableInBot && p.quantity > 0)
    if (availableProducts.length === 0) return

    const randomProduct = availableProducts[Math.floor(Math.random() * availableProducts.length)]
    const maxQuantity = Math.min(randomProduct.quantity, 3)
    const quantity = Math.floor(Math.random() * maxQuantity) + 1

    const customerNames = [
      "María González",
      "Ana López",
      "Carmen Rodríguez",
      "Isabel Martín",
      "Lucía Fernández",
      "Sofía García",
      "Elena Ruiz",
      "Patricia Moreno",
    ]

    const customerName = customerNames[Math.floor(Math.random() * customerNames.length)]

    const saleSuccess = this.recordSale("bot", {
      productId: randomProduct.id,
      quantity: quantity,
      salePrice: randomProduct.price,
      customerName: customerName,
      telegramUserId: Math.floor(Math.random() * 1000000),
    })

    if (saleSuccess) {
      // Update last activity
      document.getElementById("lastActivity").textContent = this.formatDate(new Date().toISOString())

      // Show notification (optional)
      console.log(`🤖 Bot Sale: ${quantity} ${randomProduct.name} sold to ${customerName}`)
    }
  }

  getCategoryName(category) {
    const categories = {
      labiales: "Labiales",
      bases: "Bases",
      sombras: "Sombras",
      rubores: "Rubores",
      mascaras: "Máscaras",
      delineadores: "Delineadores",
      skincare: "Skincare",
      otros: "Otros",
    }
    return categories[category] || category
  }

  formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  showModal(title, message) {
    document.getElementById("modalTitle").textContent = title
    document.getElementById("modalMessage").textContent = message
    document.getElementById("successModal").style.display = "block"
  }

  closeModal() {
    document.getElementById("successModal").style.display = "none"
  }

  saveData() {
    localStorage.setItem("beautyProducts", JSON.stringify(this.products))
    localStorage.setItem("beautySales", JSON.stringify(this.sales))
  }

  // Get products available for bot
  getBotProducts() {
    return this.products.filter((p) => p.availableInBot && p.quantity > 0)
  }

  // Export data functionality
  exportData() {
    const data = {
      products: this.products,
      sales: this.sales,
      botConfig: this.botConfig,
      exportDate: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `beauty-inventory-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Import data functionality
  importData(file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (data.products && data.sales) {
          this.products = data.products
          this.sales = data.sales
          if (data.botConfig) {
            this.botConfig = data.botConfig
          }
          this.saveData()
          this.init()
          this.showModal("¡Datos Importados!", "Los datos han sido importados exitosamente.")
        }
      } catch (error) {
        alert("Error al importar los datos. Verifica que el archivo sea válido.")
      }
    }
    reader.readAsText(file)
  }
}

// Initialize the application
const inventory = new BeautyInventory()

// Add some sample data for demonstration (remove in production)
if (inventory.products.length === 0) {
  const sampleProducts = [
    {
      id: 1,
      name: "Labial Mate Ruby Rose",
      cost: 8.5,
      price: 15.0,
      quantity: 12,
      category: "labiales",
      description: "Labial mate de larga duración en tono rosa intenso",
      availableInBot: true,
      dateAdded: new Date().toISOString(),
    },
    {
      id: 2,
      name: "Base Líquida Maybelline",
      cost: 12.0,
      price: 22.0,
      quantity: 8,
      category: "bases",
      description: "Base de cobertura media a completa, acabado natural",
      availableInBot: true,
      dateAdded: new Date().toISOString(),
    },
    {
      id: 3,
      name: "Paleta de Sombras Urban Decay",
      cost: 25.0,
      price: 45.0,
      quantity: 5,
      category: "sombras",
      description: "Paleta con 12 tonos neutros y vibrantes",
      availableInBot: true,
      dateAdded: new Date().toISOString(),
    },
  ]

  inventory.products = sampleProducts
  inventory.saveData()
  inventory.init()
}
