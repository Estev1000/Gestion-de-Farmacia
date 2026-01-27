// ============================================
// CONFIGURACIÓN Y ESTADO
// ============================================

class FarmaciaApp {
    constructor() {
        // Estado inicial
        this.productos = [];
        this.carrito = [];
        this.ventasTotales = 0.0;
        this.historialVentas = []; // Nuevo: historial de ventas con dispensa

        // Cargar datos del localStorage
        this.cargarDatos();

        // Método de rotación por defecto (persistido en localStorage)
        this.rotacionMethod = localStorage.getItem('rotacionMethod') || 'FIFO';

        // Inicializar interfaz
        this.inicializar();
    }

    // ============================================
    // ALMACENAMIENTO DE DATOS
    // ============================================

    cargarDatos() {
        try {
            const datosGuardados = localStorage.getItem('farmaciaData');
            if (datosGuardados) {
                const datos = JSON.parse(datosGuardados);
                this.productos = datos.productos || [];
                this.ventasTotales = datos.ventasTotales || 0.0;
                this.historialVentas = datos.historialVentas || [];

                // Migrar productos antiguos (con 'stock' simple) a nueva estructura con 'lotes'
                this.productos = this.productos.map(p => {
                    if (!p.lotes) {
                        const cantidad = p.stock || 0;
                        const lote = {
                            id: 'migr-' + (p.id || Date.now()) + '-' + Math.random(),
                            numero: p.numeroLote || null,
                            cantidad: cantidad,
                            fechaIngreso: new Date().toISOString(),
                            vencimiento: p.vencimiento || null
                        };
                        return Object.assign({}, p, { lotes: cantidad > 0 ? [lote] : [] });
                    }
                    return p;
                });
            } else {
                // Datos de prueba iniciales si está vacío (usar lotes)
                if (this.productos.length === 0) {
                    const ahora = new Date().toISOString();
                    this.productos = [
                        { id: 1, nombre: 'Paracetamol 500mg', precio: 5.00, lotes: [{ id: 101, numero: 'L-PA-01', cantidad: 100, fechaIngreso: ahora, vencimiento: null }] },
                        { id: 2, nombre: 'Ibuprofeno 400mg', precio: 8.50, lotes: [{ id: 102, numero: 'L-IB-01', cantidad: 50, fechaIngreso: ahora, vencimiento: null }] },
                        { id: 3, nombre: 'Amoxicilina 500mg', precio: 12.00, lotes: [{ id: 103, numero: 'L-AM-01', cantidad: 30, fechaIngreso: ahora, vencimiento: null }] },
                        { id: 4, nombre: 'Alcohol Etílico 96°', precio: 4.50, lotes: [{ id: 104, numero: 'L-AL-01', cantidad: 20, fechaIngreso: ahora, vencimiento: null }] },
                        { id: 5, nombre: 'Gasas Estériles', precio: 2.00, lotes: [{ id: 105, numero: 'L-GA-01', cantidad: 200, fechaIngreso: ahora, vencimiento: null }] }
                    ];
                    this.guardarDatos();
                }
            }
        } catch (error) {
            console.error('Error al cargar datos:', error);
        }
    }

    guardarDatos() {
        try {
            const datos = {
                productos: this.productos,
                ventasTotales: this.ventasTotales,
                historialVentas: this.historialVentas
            };
            localStorage.setItem('farmaciaData', JSON.stringify(datos));
        } catch (error) {
            console.error('Error al guardar datos:', error);
        }
    }

    // ============================================
    // INICIALIZACIÓN
    // ============================================

    inicializar() {
        this.setupElementos();
        this.configurarEventos();
        this.actualizarUI();
        // Verificar estado premium (si se activó por link o localStorage)
        try { this.checkPremiumStatus(); } catch (e) { /* silent */ }
    }

    setupElementos() {
        this.elementos = {
            // Inventario
            prodNombre: document.getElementById('prodNombre'),
            prodCodigoBarras: document.getElementById('prodCodigoBarras'),
            prodPrecio: document.getElementById('prodPrecio'),
            prodStock: document.getElementById('prodStock'),
            prodLote: document.getElementById('prodLote'),
            prodVencimiento: document.getElementById('prodVencimiento'),
            selectRotacion: document.getElementById('selectRotacion'),
            btnAgregarProducto: document.getElementById('btnAgregarProducto'),
            listaProductos: document.getElementById('listaProductos'),

            // Excel
            btnImportarExcel: document.getElementById('btnImportarExcel'),
            btnExportarExcel: document.getElementById('btnExportarExcel'),
            btnAumentoMasivo: document.getElementById('btnAumentoMasivo'),
            btnReduccionMasiva: document.getElementById('btnReduccionMasiva'),
            inputExcel: document.getElementById('inputExcel'),

            // Ventas
            inputCodigoBarras: document.getElementById('inputCodigoBarras'),
            selectProductoVenta: document.getElementById('selectProductoVenta'),
            cantidadVenta: document.getElementById('cantidadVenta'),
            inputPaciente: document.getElementById('inputPaciente'),
            inputDocumento: document.getElementById('inputDocumento'),
            btnAgregarCarrito: document.getElementById('btnAgregarCarrito'),

            // Carrito
            tablaCarrito: document.getElementById('tablaCarrito'),
            cuerpoTablaCarrito: document.getElementById('cuerpoTablaCarrito'),
            carritoVacio: document.getElementById('carritoVacio'),
            totalCarrito: document.getElementById('totalCarrito'),

            // Acciones Finales
            btnFinalizarCompra: document.getElementById('btnFinalizarCompra'),
            btnCancelarCompra: document.getElementById('btnCancelarCompra'),

            // Header / Toolbar
            btnVerVentas: document.getElementById('btnVerVentas'),
            btnVentasHeader: document.getElementById('btnVentasHeader'),
            btnImprimirTicket: document.getElementById('btnImprimirTicket'),

            // Tabs
            tabButtons: document.querySelectorAll('.tab-button'),
            tabContents: document.querySelectorAll('.tab-content'),

            // Modales
            modalConfirmacion: document.getElementById('modalConfirmacion'),
            modalInfo: document.getElementById('modalInfo'),
            modalError: document.getElementById('modalError'),

            btnConfirmarSi: document.getElementById('btnConfirmarSi'),
            btnConfirmarNo: document.getElementById('btnConfirmarNo'),
            btnCerrarInfo: document.getElementById('btnCerrarInfo'),
            btnCerrarError: document.getElementById('btnCerrarError'),
            // Suscripción (pestaña Suscripción)
            btnSuscribirBasico: document.getElementById('btnSuscribirBasico'),
            btnSuscribirEstandar: document.getElementById('btnSuscribirEstandar'),
            btnSuscribirGratis: document.getElementById('btnSuscribirGratis'),
        };
    }

    configurarEventos() {
        // Inventario
        this.elementos.btnAgregarProducto.addEventListener('click', () => this.agregarProducto());

        // Excel
        if (this.elementos.btnImportarExcel) this.elementos.btnImportarExcel.addEventListener('click', () => this.elementos.inputExcel.click());
        if (this.elementos.inputExcel) this.elementos.inputExcel.addEventListener('change', (e) => this.procesarExcel(e));
        if (this.elementos.btnExportarExcel) this.elementos.btnExportarExcel.addEventListener('click', () => this.exportarExcel());
        if (this.elementos.btnAumentoMasivo) this.elementos.btnAumentoMasivo.addEventListener('click', () => this.aumentoMasivo());
        if (this.elementos.btnReduccionMasiva) this.elementos.btnReduccionMasiva.addEventListener('click', () => this.reduccionMasiva());

        // Ventas - Código de barras (scanner)
        this.elementos.inputCodigoBarras.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.buscarPorCodigoBarras();
            }
        });
        this.elementos.btnAgregarCarrito.addEventListener('click', () => this.agregarAlCarrito());
        this.elementos.btnFinalizarCompra.addEventListener('click', () => this.finalizarCompra());
        this.elementos.btnCancelarCompra.addEventListener('click', () => this.cancelarCompra());

        // Globales
        this.elementos.btnVerVentas.addEventListener('click', () => this.verVentasTotales());
        this.elementos.btnVentasHeader.addEventListener('click', () => this.verVentasTotales());
        this.elementos.btnImprimirTicket.addEventListener('click', () => this.imprimirUltimoTicket());

        // Tabs
        this.elementos.tabButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                this.abrirTab(tabId);
            });
        });

        // Rotación FIFO/FEFO
        if (this.elementos.selectRotacion) {
            // Inicializar valor desde preferencia
            this.elementos.selectRotacion.value = this.rotacionMethod || 'FIFO';
            this.elementos.selectRotacion.addEventListener('change', (e) => {
                const val = e.target.value;
                this.rotacionMethod = val;
                try { localStorage.setItem('rotacionMethod', val); } catch (err) { console.error(err); }
            });
        }

        // Modales
        this.elementos.btnConfirmarNo.addEventListener('click', () => this.cerrarModal('confirmacion'));
        this.elementos.btnCerrarInfo.addEventListener('click', () => this.cerrarModal('info'));
        this.elementos.btnCerrarError.addEventListener('click', () => this.cerrarModal('error'));

        // Suscripción / Mercado Pago
        if (this.elementos.btnSuscribirBasico) this.elementos.btnSuscribirBasico.addEventListener('click', () => this.suscribirPlan('basic'));
        if (this.elementos.btnSuscribirEstandar) this.elementos.btnSuscribirEstandar.addEventListener('click', () => this.suscribirPlan('standard'));
        if (this.elementos.btnSuscribirGratis) this.elementos.btnSuscribirGratis.addEventListener('click', () => this.suscribirPlan('free'));
        // Soporte
        this.elementos.btnSoporte = document.getElementById('btnSoporte');
        if (this.elementos.btnSoporte) this.elementos.btnSoporte.addEventListener('click', () => {
            const modal = document.getElementById('modalSupport');
            if (modal) modal.classList.add('active');
        });

        // Soporte: formulario que envía a Formspree y botones de copia/WhatsApp
        const formSupport = document.getElementById('formSupport');
        if (formSupport) {
            formSupport.addEventListener('submit', () => {
                // dejar que el formulario se envíe normalmente (target=_blank)
                setTimeout(() => {
                    const modal = document.getElementById('modalSupport');
                    if (modal) modal.classList.remove('active');
                    this.mostrarInfo('Gracias. Se abrió una nueva pestaña para enviar tu mensaje.');
                }, 300);
            });
        }

        // Copiar link de soporte (Formspree) y cerrar modal
        const copyBtn = document.getElementById('supportCopyLink');
        if (copyBtn) copyBtn.addEventListener('click', () => {
            const link = 'https://formspree.io/f/mvgzqkpv';
            navigator.clipboard.writeText(link).then(() => alert('Link de soporte copiado al portapapeles'));
        });
        const closeSupport = document.getElementById('supportClose');
        if (closeSupport) closeSupport.addEventListener('click', () => {
            const modal = document.getElementById('modalSupport');
            if (modal) modal.classList.remove('active');
        });

        // Cerrar modales al hacer click fuera
        [this.elementos.modalConfirmacion, this.elementos.modalInfo, this.elementos.modalError].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        });
    }

    actualizarUI() {
        this.renderizarInventario();
        this.actualizarSelectProductos();
        this.actualizarTablaCarrito();
    }

    abrirTab(tabId) {
        // Remover active
        this.elementos.tabButtons.forEach(btn => btn.classList.remove('active'));
        this.elementos.tabContents.forEach(content => content.classList.remove('active'));

        // Activar nuevo
        document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(tabId).classList.add('active');
    }

    // ============================================
    // GESTIÓN DE INVENTARIO
    // ============================================

    agregarProducto() {
        const nombre = this.elementos.prodNombre.value.trim();
        const codigoBarras = this.elementos.prodCodigoBarras.value.trim();
        const precioStr = this.elementos.prodPrecio.value.trim().replace(',', '.');
        const stockStr = this.elementos.prodStock.value.trim();
        const loteNumero = this.elementos.prodLote ? this.elementos.prodLote.value.trim() : null;
        const vencimientoVal = this.elementos.prodVencimiento ? this.elementos.prodVencimiento.value : null;

        if (!nombre) return this.mostrarError('El nombre es obligatorio');

        const precio = parseFloat(precioStr);
        if (isNaN(precio) || precio <= 0) return this.mostrarError('Precio inválido');

        const stock = parseInt(stockStr);
        if (isNaN(stock) || stock < 0) return this.mostrarError('Stock inválido');

        const nuevoProducto = {
            id: Date.now(),
            nombre,
            codigoBarras: codigoBarras || null,
            precio,
            lotes: []
        };

        if (stock > 0) {
            nuevoProducto.lotes.push({ id: 'lot-' + Date.now(), numero: loteNumero || null, cantidad: stock, fechaIngreso: new Date().toISOString(), vencimiento: vencimientoVal || null });
        }

        this.productos.push(nuevoProducto);
        this.guardarDatos();

        // Limpiar form
        this.elementos.prodNombre.value = '';
        this.elementos.prodCodigoBarras.value = '';
        this.elementos.prodPrecio.value = '';
        this.elementos.prodStock.value = '';
        if (this.elementos.prodLote) this.elementos.prodLote.value = '';
        if (this.elementos.prodVencimiento) this.elementos.prodVencimiento.value = '';

        this.actualizarUI();
        this.mostrarInfo('Producto agregado correctamente');
    }

    eliminarProducto(id) {
        this.mostrarConfirmacion('¿Eliminar este producto?', () => {
            this.productos = this.productos.filter(p => p.id !== id);
            this.guardarDatos();
            this.actualizarUI();
        });
    }

    renderizarInventario() {
        this.elementos.listaProductos.innerHTML = '';
        this.productos.forEach(prod => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${prod.nombre}</td>
                <td>$${prod.precio.toFixed(2)}</td>
                <td>${this.getStock(prod)}</td>
                <td>
                    <button class="btn btn-danger btn-small btn-eliminar-prod" data-id="${prod.id}">🗑️</button>
                </td>
            `;
            tr.querySelector('.btn-eliminar-prod').addEventListener('click', () => this.eliminarProducto(prod.id));
            this.elementos.listaProductos.appendChild(tr);
        });
    }

    // Retorna la suma de cantidades en los lotes del producto
    getStock(producto) {
        if (!producto) return 0;
        if (!producto.lotes || !Array.isArray(producto.lotes)) return producto.stock || 0;
        return producto.lotes.reduce((s, l) => s + (l.cantidad || 0), 0);
    }

    // Consume cantidad de los lotes de un producto siguiendo FIFO o FEFO según 'method'
    // method: 'FIFO' (por fechaIngreso) o 'FEFO' (por vencimiento). Devuelve detalle de lotes consumidos [{loteId, numero, cantidad}]
    consumeFromLotes(producto, cantidad, method = null) {
        const detalle = [];
        if (!producto.lotes || producto.lotes.length === 0) return detalle;

        const modo = method || (producto.rotacion) || this.rotacionMethod || 'FIFO';

        // Ordenar según el modo seleccionado
        if (modo === 'FEFO') {
            // FEFO: por fecha de vencimiento ascendente; lotes sin vencimiento al final
            producto.lotes.sort((a, b) => {
                if (a.vencimiento && b.vencimiento) return new Date(a.vencimiento) - new Date(b.vencimiento);
                if (a.vencimiento && !b.vencimiento) return -1;
                if (!a.vencimiento && b.vencimiento) return 1;
                // desempate por fechaIngreso
                return new Date(a.fechaIngreso) - new Date(b.fechaIngreso);
            });
        } else {
            // FIFO: por fechaIngreso ascendente
            producto.lotes.sort((a, b) => new Date(a.fechaIngreso) - new Date(b.fechaIngreso));
        }

        let restante = cantidad;
        for (let i = 0; i < producto.lotes.length && restante > 0;) {
            const lote = producto.lotes[i];
            const disponible = lote.cantidad || 0;
            if (disponible <= 0) {
                producto.lotes.splice(i, 1);
                continue;
            }

            const consumir = Math.min(disponible, restante);
            lote.cantidad = disponible - consumir;
            detalle.push({ loteId: lote.id, numero: lote.numero, cantidad: consumir });
            restante -= consumir;

            if (lote.cantidad === 0) {
                producto.lotes.splice(i, 1);
            } else {
                i++;
            }
        }

        return detalle;
    }

    // ============================================
    // EXCEL Y ACTUALIZACIÓN MASIVA
    // ============================================

    procesarExcel(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) return this.mostrarError('El archivo Excel está vacío');

                let importados = 0;
                let actualizados = 0;

                json.forEach(row => {
                    // Intentar mapear columnas (Nombre, Precio, Stock)
                    const keys = Object.keys(row);
                    const keyNombre = keys.find(k => /nombre|producto|descripcion/i.test(k));
                    const keyPrecio = keys.find(k => /precio|valor|costo/i.test(k));
                    const keyStock = keys.find(k => /stock|cantidad|existencia/i.test(k));

                    if (keyNombre && keyPrecio) {
                        const nombre = String(row[keyNombre]).trim();
                        const precio = parseFloat(row[keyPrecio]);
                        const stock = keyStock ? parseInt(row[keyStock]) || 0 : 0;

                        if (nombre && !isNaN(precio)) {
                            // Buscar si ya existe
                            const existente = this.productos.find(p => p.nombre.toLowerCase() === nombre.toLowerCase());

                            if (existente) {
                                existente.precio = precio;
                                if (keyStock && stock > 0) {
                                    // agregar lote con la cantidad indicada
                                    if (!existente.lotes) existente.lotes = [];
                                    existente.lotes.push({ id: 'imp-' + Date.now() + Math.random(), numero: null, cantidad: stock, fechaIngreso: new Date().toISOString(), vencimiento: null });
                                }
                                actualizados++;
                            } else {
                                const nuevo = {
                                    id: Date.now() + Math.random(),
                                    nombre,
                                    precio,
                                    lotes: []
                                };
                                if (stock > 0) {
                                    nuevo.lotes.push({ id: 'imp-' + Date.now() + Math.random(), numero: null, cantidad: stock, fechaIngreso: new Date().toISOString(), vencimiento: null });
                                }
                                this.productos.push(nuevo);
                                importados++;
                            }
                        }
                    }
                });

                this.guardarDatos();
                this.actualizarUI();
                this.elementos.inputExcel.value = ''; // Limpiar input
                this.mostrarInfo(`Proceso completado.<br>Importados: ${importados}<br>Actualizados: ${actualizados}`);

            } catch (error) {
                console.error(error);
                this.mostrarError('Error al procesar el archivo Excel');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    exportarExcel() {
        if (this.productos.length === 0) return this.mostrarError('No hay productos para exportar');

        try {
            const datosExportar = this.productos.map(p => ({
                Producto: p.nombre,
                Precio: p.precio,
                Stock: this.getStock(p)
            }));

            const ws = XLSX.utils.json_to_sheet(datosExportar);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Inventario");

            const fecha = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `Inventario_Farmacia_${fecha}.xlsx`);

            this.mostrarInfo('Archivo Excel exportado correctamente');
        } catch (error) {
            console.error(error);
            this.mostrarError('Error al exportar Excel');
        }
    }

    // Solicita un porcentaje (acepta coma como separador decimal) y aplica aumento o reducción
    aumentoMasivo() {
        const porcentajeStr = prompt("Ingrese el porcentaje de aumento (ej: 10 para 10% o 10,5 para 10.5%):");
        if (porcentajeStr === null) return;

        const pct = porcentajeStr.replace(',', '.').trim();
        const porcentaje = parseFloat(pct);
        if (isNaN(porcentaje)) return this.mostrarError('Porcentaje inválido');

        this.mostrarConfirmacion(`¿Aumentar un ${porcentaje}% el precio de TODOS los productos?`, () => {
            this.aplicarAjusteMasivo(porcentaje);
        });
    }

    reduccionMasiva() {
        const porcentajeStr = prompt("Ingrese el porcentaje de reducción (ej: 10 para 10% o 10,5 para 10.5%):");
        if (porcentajeStr === null) return;

        const pct = porcentajeStr.replace(',', '.').trim();
        const porcentaje = parseFloat(pct);
        if (isNaN(porcentaje)) return this.mostrarError('Porcentaje inválido');

        const porcentajeNeg = -Math.abs(porcentaje);
        this.mostrarConfirmacion(`¿Reducir en ${Math.abs(porcentaje)}% el precio de TODOS los productos?`, () => {
            this.aplicarAjusteMasivo(porcentajeNeg);
        });
    }

    aplicarAjusteMasivo(porcentaje) {
        let contador = 0;
        this.productos.forEach(p => {
            const ajuste = p.precio * (porcentaje / 100);
            let nuevoPrecio = parseFloat((p.precio + ajuste).toFixed(2));
            if (nuevoPrecio < 0) nuevoPrecio = 0.00;
            p.precio = nuevoPrecio;
            contador++;
        });

        this.guardarDatos();
        this.actualizarUI();
        const accion = porcentaje >= 0 ? 'actualizaron' : 'redujeron';
        this.mostrarInfo(`Se ${accion} ${contador} productos correctamente.`);
    }

    // ============================================
    // VENTAS
    // ============================================

    buscarPorCodigoBarras() {
        const codigo = this.elementos.inputCodigoBarras.value.trim();
        if (!codigo) return;

        const producto = this.productos.find(p => p.codigoBarras === codigo);

        if (producto) {
            // Seleccionar el producto en el select
            this.elementos.selectProductoVenta.value = producto.id;
            // Limpiar el campo de código de barras
            this.elementos.inputCodigoBarras.value = '';
            // Enfocar en cantidad
            this.elementos.cantidadVenta.focus();
            this.elementos.cantidadVenta.select();
        } else {
            this.mostrarError(`No se encontró producto con código: ${codigo}`);
            this.elementos.inputCodigoBarras.value = '';
        }
    }

    actualizarSelectProductos() {
        const select = this.elementos.selectProductoVenta;
        const valorActual = select.value;

        select.innerHTML = '<option value="">Seleccione un producto...</option>';

        this.productos.forEach(prod => {
            const option = document.createElement('option');
            option.value = prod.id;
            const codigoInfo = prod.codigoBarras ? ` [${prod.codigoBarras}]` : '';
            option.textContent = `${prod.nombre}${codigoInfo} - $${prod.precio.toFixed(2)} (Stock: ${this.getStock(prod)})`;
            select.appendChild(option);
        });

        if (valorActual) select.value = valorActual;
    }

    agregarAlCarrito() {
        const idProd = parseInt(this.elementos.selectProductoVenta.value);
        const cantidad = parseInt(this.elementos.cantidadVenta.value);

        if (!idProd) return this.mostrarError('Seleccione un producto');
        if (isNaN(cantidad) || cantidad < 1) return this.mostrarError('Cantidad inválida');

        const producto = this.productos.find(p => p.id === idProd);
        if (!producto) return this.mostrarError('Producto no encontrado');

        const disponible = this.getStock(producto);
        if (disponible < cantidad) {
            return this.mostrarError(`Stock insuficiente. Disponible: ${disponible}`);
        }

        // Verificar si ya está en carrito
        const itemExistente = this.carrito.find(item => item.producto.id === idProd);

        if (itemExistente) {
            if (disponible < (itemExistente.cantidad + cantidad)) {
                return this.mostrarError(`Stock insuficiente para agregar más. En carrito: ${itemExistente.cantidad}, Disponible total: ${disponible}`);
            }
            itemExistente.cantidad += cantidad;
            itemExistente.subtotal = itemExistente.cantidad * itemExistente.precioUnitario;
        } else {
            this.carrito.push({
                producto: producto,
                cantidad: cantidad,
                precioUnitario: producto.precio,
                subtotal: cantidad * producto.precio
            });
        }

        this.elementos.cantidadVenta.value = 1;
        this.actualizarTablaCarrito();
    }

    actualizarTablaCarrito() {
        this.elementos.cuerpoTablaCarrito.innerHTML = '';
        let total = 0;

        if (this.carrito.length === 0) {
            this.elementos.tablaCarrito.style.display = 'none';
            this.elementos.carritoVacio.style.display = 'block';
            this.elementos.totalCarrito.textContent = '$0.00';
            return;
        }

        this.elementos.tablaCarrito.style.display = 'table';
        this.elementos.carritoVacio.style.display = 'none';

        this.carrito.forEach((item, index) => {
            total += item.subtotal;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.producto.nombre}</td>
                <td>${item.cantidad}</td>
                <td>$${item.precioUnitario.toFixed(2)}</td>
                <td>$${item.subtotal.toFixed(2)}</td>
                <td>
                    <button class="btn btn-danger btn-small btn-eliminar-item" data-index="${index}">✕</button>
                </td>
            `;
            tr.querySelector('.btn-eliminar-item').addEventListener('click', () => this.eliminarDelCarrito(index));
            this.elementos.cuerpoTablaCarrito.appendChild(tr);
        });

        this.elementos.totalCarrito.textContent = `$${total.toFixed(2)}`;
    }

    eliminarDelCarrito(index) {
        this.carrito.splice(index, 1);
        this.actualizarTablaCarrito();
    }

    cancelarCompra() {
        if (this.carrito.length === 0) return;
        this.mostrarConfirmacion('¿Cancelar venta y vaciar carrito?', () => {
            this.carrito = [];
            this.actualizarTablaCarrito();
        });
    }

    finalizarCompra() {
        if (this.carrito.length === 0) return this.mostrarError('El carrito está vacío');

        this.mostrarConfirmacion('¿Confirmar venta e imprimir ticket?', () => {
            try {
                // Obtener datos del paciente
                const paciente = this.elementos.inputPaciente.value.trim();
                const documento = this.elementos.inputDocumento.value.trim();

                // Calcular total
                const totalVenta = this.carrito.reduce((sum, item) => sum + item.subtotal, 0);

                // Actualizar stock consumiendo de lotes por FIFO
                const detalleConsumoGlobal = [];
                this.carrito.forEach(item => {
                    const prod = this.productos.find(p => p.id === item.producto.id);
                    if (prod) {
                        const method = prod.rotacion || this.rotacionMethod || 'FIFO';
                        const detalle = this.consumeFromLotes(prod, item.cantidad, method);
                        detalleConsumoGlobal.push({ productoId: prod.id, nombre: prod.nombre, detalle });
                    }
                });

                // Actualizar caja
                this.ventasTotales += totalVenta;

                // Guardar en historial de ventas (DISPENSA)
                const registroVenta = {
                    id: Date.now(),
                    fecha: new Date().toISOString(),
                    paciente: paciente || 'Sin especificar',
                    documento: documento || 'Sin especificar',
                    items: this.carrito.map(item => ({
                        producto: item.producto.nombre,
                        cantidad: item.cantidad,
                        precio: item.precioUnitario,
                        subtotal: item.subtotal
                    })),
                    total: totalVenta,
                    detalleConsumo: detalleConsumoGlobal
                };
                this.historialVentas.push(registroVenta);

                // Guardar última venta para reimpresión
                const ultimaVenta = {
                    items: [...this.carrito],
                    total: totalVenta,
                    fecha: new Date().toISOString(),
                    paciente: paciente,
                    documento: documento
                };
                localStorage.setItem('ultimaVenta', JSON.stringify(ultimaVenta));

                // Guardar todo
                this.guardarDatos();

                // Intentar imprimir ticket (no debe detener el flujo si falla)
                try {
                    const carritoParaTicket = [...this.carrito];
                    this.imprimirTicket(carritoParaTicket, totalVenta, null, paciente, documento);
                } catch (printError) {
                    console.error('Error al imprimir:', printError);
                    this.mostrarError('Venta registrada, pero no se pudo imprimir el ticket (¿Bloqueo de popups?)');
                }

                // Limpiar y actualizar UI (CRÍTICO: Debe ejecutarse siempre)
                this.carrito = [];
                this.elementos.cantidadVenta.value = 1;
                this.elementos.selectProductoVenta.value = "";
                this.elementos.inputPaciente.value = "";
                this.elementos.inputDocumento.value = "";
                this.elementos.inputCodigoBarras.value = "";
                this.actualizarUI();

                // Solo mostrar éxito si no hay otro modal (como el de error de impresión)
                if (!document.querySelector('.modal.active')) {
                    // Mostrar resumen ligero con consumo por lotes
                    let resumen = `Venta registrada. Total: $${totalVenta.toFixed(2)}`;
                    if (paciente) resumen += `<br>Paciente: ${paciente}`;
                    resumen += '<br><br><strong>Consumo por lotes (FIFO):</strong><br>';
                    detalleConsumoGlobal.forEach(d => {
                        if (!d.detalle || d.detalle.length === 0) return;
                        resumen += `${d.nombre}: ` + d.detalle.map(x => `${x.cantidad} (lote:${x.numero || x.loteId})`).join(', ') + '<br>';
                    });
                    this.mostrarInfo(resumen);
                }
            } catch (error) {
                console.error('Error crítico en finalizarCompra:', error);
                this.mostrarError('Error al procesar la venta: ' + error.message);
            }
        });
    }

    verVentasTotales() {
        this.mostrarInfo(`Caja acumulada: <strong>$${this.ventasTotales.toFixed(2)}</strong>`);
    }

    // ============================================
    // IMPRESIÓN
    // ============================================

    imprimirUltimoTicket() {
        try {
            const ultimaVentaStr = localStorage.getItem('ultimaVenta');
            if (!ultimaVentaStr) {
                return this.mostrarInfo('No hay ventas registradas recientemente para imprimir.');
            }

            const ultimaVenta = JSON.parse(ultimaVentaStr);
            this.imprimirTicket(ultimaVenta.items, ultimaVenta.total, new Date(ultimaVenta.fecha), ultimaVenta.paciente, ultimaVenta.documento);
        } catch (error) {
            console.error('Error al reimprimir:', error);
            this.mostrarError('No se pudo recuperar la última venta.');
        }
    }

    imprimirTicket(items, total, fechaPersonalizada = null, paciente = null, documento = null) {
        const ventanaImpresion = window.open('', '_blank');

        if (!ventanaImpresion) {
            throw new Error('No se pudo abrir la ventana de impresión. Verifique los bloqueadores de ventanas emergentes.');
        }

        const fecha = fechaPersonalizada
            ? fechaPersonalizada.toLocaleDateString('es-ES') + ' ' + fechaPersonalizada.toLocaleTimeString('es-ES')
            : new Date().toLocaleDateString('es-ES') + ' ' + new Date().toLocaleTimeString('es-ES');

        let html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Ticket Farmacia</title>
                <style>
                    body { font-family: 'Courier New', monospace; max-width: 300px; margin: 0; padding: 10px; }
                    .ticket { text-align: center; }
                    .header { margin-bottom: 10px; }
                    .separador { border-top: 1px dashed #000; margin: 5px 0; }
                    .item { display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; }
                    .total { font-weight: bold; text-align: right; margin-top: 10px; font-size: 14px; }
                    .footer { font-size: 10px; margin-top: 15px; }
                    .dispensa { font-size: 11px; text-align: left; margin: 10px 0; }
                </style>
            </head>
            <body>
                <div class="ticket">
                    <div class="header">
                        <h3>⚕️ FARMACIA CENTRAL ⚕️</h3>
                        <p>RUT: 12.345.678-9</p>
                        <p>${fecha}</p>
                    </div>
                    <div class="separador"></div>
        `;

        // Agregar información de dispensa si existe
        if (paciente || documento) {
            html += '<div class="dispensa">';
            if (paciente) html += `<strong>Paciente:</strong> ${paciente}<br>`;
            if (documento) html += `<strong>Doc/RUT:</strong> ${documento}<br>`;
            html += '</div><div class="separador"></div>';
        }

        items.forEach(item => {
            html += `
                <div class="item">
                    <span>${item.cantidad} x ${item.producto.nombre}</span>
                </div>
                <div class="item" style="justify-content: flex-end;">
                    <span>$${item.subtotal.toFixed(2)}</span>
                </div>
            `;
        });

        html += `
                    <div class="separador"></div>
                    <div class="total">TOTAL: $${total.toFixed(2)}</div>
                    <div class="footer">
                        ¡Gracias por su preferencia!<br>
                        Conserve este ticket
                    </div>
                </div>
                <script>
                    window.print();
                    setTimeout(() => window.close(), 500);
                </script>
            </body>
            </html>
        `;

        ventanaImpresion.document.write(html);
        ventanaImpresion.document.close();
    }

    // ============================================
    // MODALES
    // ============================================

    mostrarConfirmacion(mensaje, callback) {
        document.getElementById('textoConfirmacion').textContent = mensaje;
        this.elementos.modalConfirmacion.classList.add('active');

        const btnSiNuevo = this.elementos.btnConfirmarSi.cloneNode(true);
        this.elementos.btnConfirmarSi.parentNode.replaceChild(btnSiNuevo, this.elementos.btnConfirmarSi);
        this.elementos.btnConfirmarSi = btnSiNuevo;

        this.elementos.btnConfirmarSi.addEventListener('click', () => {
            this.cerrarModal('confirmacion');
            callback();
        }, { once: true });
    }

    mostrarInfo(mensaje) {
        document.getElementById('textoInfo').innerHTML = mensaje;
        this.elementos.modalInfo.classList.add('active');
    }

    mostrarError(mensaje) {
        document.getElementById('textoError').textContent = mensaje;
        this.elementos.modalError.classList.add('active');
    }

    cerrarModal(tipo) {
        const modal = document.getElementById(tipo === 'confirmacion' ? 'modalConfirmacion' : tipo === 'info' ? 'modalInfo' : 'modalError');
        if (modal) modal.classList.remove('active');
    }

    // ============================================
    // SUSCRIPCIONES / PAGOS (Cliente - Smart-Link / mpago.la)
    // Implementación sin Python: abre Smart-Link y activa por URL/localStorage
    // ============================================

    suscribirPlan(planId) {
        // Plan gratuito
        if (planId === 'free' || planId === 'gratis') {
            localStorage.setItem('farmacia_premium_active', 'false');
            this.mostrarInfo('Has seleccionado el plan <strong>Gratis</strong>. Limitado a 50 productos y funciones básicas.');
            return;
        }

        // Flujo cliente (igual que en Software para Gimnasios): abrimos modal con Smart-Link
        const planLinks = {
            // Smart-Links proporcionados por el usuario (Mercado Pago)
            'basic': { url: 'https://mpago.la/1AbS4Y7', priceLabel: '$8.000 ARS' },
            'standard': { url: 'https://mpago.la/22tnU3W', priceLabel: '$15.000 ARS' }
        };

        const plan = planLinks[planId];
        if (!plan) return this.mostrarError('Plan no válido');

        // Rellenar modal con datos del plan y mostrarlo
        const modal = document.getElementById('modalPremium');
        if (!modal) {
            // Si el modal no existe, abrir el link directamente
            window.open(plan.url, '_blank');
            return;
        }

        // Actualizar contenido dinámico dentro del modal (si existen elementos)
        const priceEl = modal.querySelector('.premium-price');
        const payLink = modal.querySelector('.mp-pay-link');
        const copyBtn = modal.querySelector('.mp-copy-btn');
        if (priceEl) priceEl.textContent = plan.priceLabel;
        if (payLink) payLink.href = plan.url;
        if (copyBtn) {
            copyBtn.onclick = () => navigator.clipboard.writeText(plan.url).then(() => alert('Link copiado al portapapeles'));
        }

        // Mostrar modal usando clase 'show' si Bootstrap/Modal no disponible
        if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
            new bootstrap.Modal(modal).show();
        } else {
            // fallback: abrir ventana
            window.open(plan.url, '_blank');
        }
    }

    // Verificar estado premium desde URL o localStorage al iniciar
    checkPremiumStatus() {
        const urlParams = new URLSearchParams(window.location.search);
        const accessCode = urlParams.get('access');

        // Verificar códigos de activación desde URL
        if (accessCode === 'farmacia_basic_2025') {
            localStorage.setItem('farmacia_premium_active', 'basic');
            localStorage.setItem('farmacia_premium_plan', 'Básico - $8.000 ARS');
            window.history.replaceState({}, document.title, window.location.pathname);
            this.mostrarInfo('¡Pago Exitoso! Plan <strong>Básico</strong> activado. 🎉');
        } else if (accessCode === 'farmacia_pro_2025') {
            localStorage.setItem('farmacia_premium_active', 'pro');
            localStorage.setItem('farmacia_premium_plan', 'Pro - $15.000 ARS');
            window.history.replaceState({}, document.title, window.location.pathname);
            this.mostrarInfo('¡Pago Exitoso! Plan <strong>Pro</strong> activado. 🚀');
        }

        const premiumStatus = localStorage.getItem('farmacia_premium_active');
        const premiumPlan = localStorage.getItem('farmacia_premium_plan') || 'PRO';

        // Actualizar badge en el header
        const badge = document.getElementById('badgePlanActivo');

        if (premiumStatus === 'basic') {
            // Actualizar badge
            if (badge) {
                badge.textContent = '✅ Plan Básico Activado';
                badge.style.display = 'inline-block';
                badge.style.background = '#4CAF50';
            }
            // Solo actualizar botón Básico
            if (this.elementos.btnSuscribirBasico) {
                this.elementos.btnSuscribirBasico.innerHTML = `✅ ${premiumPlan}`;
                this.elementos.btnSuscribirBasico.disabled = true;
                this.elementos.btnSuscribirBasico.classList.remove('btn-primary');
                this.elementos.btnSuscribirBasico.classList.add('btn-success');
            }
        } else if (premiumStatus === 'pro' || premiumStatus === 'true') {
            // Actualizar badge
            if (badge) {
                badge.textContent = '✅ Plan Pro Activado';
                badge.style.display = 'inline-block';
                badge.style.background = '#FF9800';
            }
            // Solo actualizar botón Estándar/Pro
            if (this.elementos.btnSuscribirEstandar) {
                this.elementos.btnSuscribirEstandar.innerHTML = `✅ ${premiumPlan}`;
                this.elementos.btnSuscribirEstandar.disabled = true;
                this.elementos.btnSuscribirEstandar.classList.remove('btn-primary');
                this.elementos.btnSuscribirEstandar.classList.add('btn-success');
            }
        } else {
            // Sin plan activado - ocultar badge
            if (badge) {
                badge.style.display = 'none';
            }
        }
    }
}

// ============================================
// FUNCIÓN GLOBAL: ACTIVACIÓN DIRECTA CON CÓDIGO
// ============================================
window.activarConCodigo = function (code) {
    if (!code) {
        alert("❌ Error: Código no proporcionado.");
        return;
    }

    // Validar y activar según el código
    if (code === 'farmacia_basic_2025') {
        localStorage.setItem('farmacia_premium_active', 'basic');
        localStorage.setItem('farmacia_premium_plan', 'Básico - $8.000 ARS');
        alert("¡Felicidades! Plan BÁSICO Activado. 🎉\n\nLa página se recargará para aplicar los cambios.");
        location.reload();
    } else if (code === 'farmacia_pro_2025') {
        localStorage.setItem('farmacia_premium_active', 'pro');
        localStorage.setItem('farmacia_premium_plan', 'Pro - $15.000 ARS');
        alert("¡Felicidades! Plan PRO Activado. 🚀\n\nLa página se recargará para aplicar los cambios.");
        location.reload();
    } else {
        alert("❌ Código inválido: " + code);
    }
};

// ============================================
// FUNCIÓN GLOBAL: ACTIVACIÓN POR CÓDIGO MANUAL
// ============================================
window.enterProCode = function () {
    const code = prompt("Ingresa tu código de activación:");
    if (!code) return;

    const codeTrimmed = code.trim();

    // Validar códigos de activación
    if (codeTrimmed === 'farmacia_basic_2025') {
        localStorage.setItem('farmacia_premium_active', 'basic');
        localStorage.setItem('farmacia_premium_plan', 'Básico - $8.000 ARS');
        alert("¡Felicidades! Plan BÁSICO Activado. 🎉\n\nRecarga la página para aplicar los cambios.");
        location.reload();
    } else if (codeTrimmed === 'farmacia_pro_2025') {
        localStorage.setItem('farmacia_premium_active', 'pro');
        localStorage.setItem('farmacia_premium_plan', 'Pro - $15.000 ARS');
        alert("¡Felicidades! Plan PRO Activado. 🚀\n\nRecarga la página para aplicar los cambios.");
        location.reload();
    } else {
        alert("❌ Código inválido.\n\nVerifica que hayas ingresado el código correctamente.");
    }
};

// Iniciar
document.addEventListener('DOMContentLoaded', () => {
    new FarmaciaApp();
});
