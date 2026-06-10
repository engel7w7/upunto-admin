"use client";
import React, { useEffect, useState } from "react";
import { auth, db } from "@/firebase/config";
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, DocumentData } from "firebase/firestore";
import { useRouter } from "next/navigation";

// Interface unificada para manejar cualquier tipo de documento de nuestra base de datos
interface ElementoPanel {
  id: string;
  titulo?: string;          // Usado en libros
  nombre?: string;          // Usado en Salud, Pensiones, Bibliotecas
  detalles?: string;
  imagen_url?: string;
  latitud?: number;
  longitud?: number;
  disponible?: boolean;     // Usado en libros
  precio_promedio?: string; // Usado en Pensiones
  salas_disponibles?: string; // Usado en Bibliotecas
}

type ModuloActivo = "fotocopias" | "salud" | "pensiones" | "bibliotecas";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<ModuloActivo>("fotocopias");
  const [elementos, setElementos] = useState<ElementoPanel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  // Estados para el Modal de Añadir / Editar
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<ElementoPanel | null>(null);

  // Estados del Formulario del Modal
  const [formNombre, setFormNombre] = useState("");
  const [formDetalles, setFormDetalles] = useState("");
  const [formImagenUrl, setFormImagenUrl] = useState("");
  const [formLatitud, setFormLatitud] = useState("");
  const [formLongitud, setFormLongitud] = useState("");
  const [formDisponible, setFormDisponible] = useState(true);
  const [formPrecio, setFormPrecio] = useState("");
  const [formSalas, setFormSalas] = useState("");

  const cambiarPestana = (tab: ModuloActivo) => {
    setLoading(true);
    setActiveTab(tab);
  };

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) router.push("/");
    });

    // Determinar la referencia de la colección según la pestaña activa
    let coleccionRef = collection(db, "pensiones");
    if (activeTab === "salud") coleccionRef = collection(db, "centros_salud");
    if (activeTab === "bibliotecas") coleccionRef = collection(db, "bibliotecas");
    if (activeTab === "fotocopias") coleccionRef = collection(db, "fotocopiadoras", "foto_central", "libros");

    const unsubscribeSnapshot = onSnapshot(coleccionRef, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ElementoPanel[];
      setElementos(data);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSnapshot();
    };
  }, [activeTab, router]);

  // 2. Abrir Modal (Modo Crear o Modo Editar)
  const abrirModal = (item: ElementoPanel | null = null) => {
    setEditingItem(item);
    if (item) {
      // Si estamos editando, precargar los datos existentes en los inputs
      setFormNombre(item.nombre || item.titulo || "");
      setFormDetalles(item.detalles || "");
      setFormImagenUrl(item.imagen_url || "");
      setFormLatitud(item.latitud?.toString() || "");
      setFormLongitud(item.longitud?.toString() || "");
      setFormDisponible(item.disponible ?? true);
      setFormPrecio(item.precio_promedio || "");
      setFormSalas(item.salas_disponibles || "");
    } else {
      // Si es nuevo, limpiar el formulario
      setFormNombre("");
      setFormDetalles("");
      setFormImagenUrl("");
      setFormLatitud("");
      setFormLongitud("");
      setFormDisponible(true);
      setFormPrecio("");
      setFormSalas("");
    }
    setIsModalOpen(true);
  };

  // 3. Guardar Datos (Insert o Update en Firestore)
  const guardarDatos = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construir la ruta de la colección correspondiente
    let colRef = collection(db, "pensiones");
    if (activeTab === "salud") colRef = collection(db, "centros_salud");
    if (activeTab === "bibliotecas") colRef = collection(db, "bibliotecas");
    if (activeTab === "fotocopias") colRef = collection(db, "fotocopiadoras", "foto_central", "libros");

    // Preparar el objeto con tipado correcto según el módulo
    const payload: DocumentData = {};
    if (activeTab === "fotocopias") {
      payload.titulo = formNombre;
      payload.disponible = formDisponible;
    } else {
      payload.nombre = formNombre;
      payload.detalles = formDetalles;
      payload.imagen_url = formImagenUrl;
      payload.latitud = parseFloat(formLatitud) || 0;
      payload.longitud = parseFloat(formLongitud) || 0;
      
      if (activeTab === "pensiones") payload.precio_promedio = formPrecio;
      if (activeTab === "bibliotecas") payload.salas_disponibles = formSalas;
    }

    try {
      if (editingItem) {
        // OPERACIÓN: ACTUALIZAR (UPDATE)
        const docRef = doc(db, colRef.path, editingItem.id);
        await updateDoc(docRef, payload);
      } else {
        // OPERACIÓN: CREAR (INSERT)
        await addDoc(colRef, payload);
      }
      setIsModalOpen(false);
    } catch (error) {
      alert("Error al interactuar con Firestore");
    }
  };

  // 4. Operación: Eliminar Registro
  const eliminarElemento = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este registro de forma permanente?")) {
      let path = "pensiones";
      if (activeTab === "salud") path = "centros_salud";
      if (activeTab === "bibliotecas") path = "bibliotecas";
      if (activeTab === "fotocopias") path = "fotocopiadoras/foto_central/libros";

      try {
        await deleteDoc(doc(db, path, id));
      } catch (error) {
        alert("No se pudo eliminar el elemento.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* BARRA LATERAL DE NAVEGACIÓN */}
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col justify-between hidden md:flex">
        <div>
          <h2 className="text-xl font-bold tracking-wider mb-8 text-blue-400 text-center">U-PUNTO SUCRE</h2>
          <nav className="space-y-2">
            <button
              onClick={() => cambiarPestana("fotocopias")}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition ${activeTab === "fotocopias" ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-400"}`}
            >
              🖨️ Libros Fotocopias
            </button>
            <button
              onClick={() => cambiarPestana("salud")}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition ${activeTab === "salud" ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-400"}`}
            >
              🏥 Centros de Salud
            </button>
            <button
              onClick={() => cambiarPestana("pensiones")}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition ${activeTab === "pensiones" ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-400"}`}
            >
              🍔 Pensión Estudiantil
            </button>
            <button
              onClick={() => cambiarPestana("bibliotecas")}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition ${activeTab === "bibliotecas" ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-400"}`}
            >
              📚 Bibliotecas USFX
            </button>
          </nav>
        </div>
        <button
          onClick={async () => { await auth.signOut(); router.push("/"); }}
          className="w-full bg-slate-800 hover:bg-red-950 text-red-400 font-bold py-2.5 rounded-xl transition text-sm text-center"
        >
          Cerrar Sesión
        </button>
      </aside>

      {/* CONTENEDOR PRINCIPAL */}
      <main className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 capitalize">Módulo: {activeTab}</h1>
            <p className="text-sm text-slate-500 mt-1">Gestión reactiva de colecciones de Firebase en tiempo real</p>
          </div>
          <button
            onClick={() => abrirModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition text-sm flex items-center gap-2"
          >
            ➕ Añadir Nuevo Registro
          </button>
        </header>

        {/* TABLA DE REGISTROS */}
        {loading ? (
          <p className="text-slate-600 font-medium animate-pulse">Sincronizando datos con Firebase...</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">Identificador / Nombre</th>
                  <th className="p-4">Detalles / Atributos</th>
                  <th className="p-4 text-center">Acciones Operativas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                {elementos.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/40 transition">
                    <td className="p-4 font-semibold text-slate-900">
                      {item.nombre || item.titulo}
                    </td>
                    <td className="p-4 text-slate-500 max-w-xs truncate">
                      {activeTab === "fotocopias" ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${item.disponible ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {item.disponible ? "En Stock" : "Agotado"}
                        </span>
                      ) : (
                        item.detalles || "Sin descripción"
                      )}
                    </td>
                    <td className="p-4 text-center flex justify-center gap-2">
                      <button
                        onClick={() => abrirModal(item)}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarElemento(item.id)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* MODAL INTELIGENTE (FORMULARIO DINÁMICO) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {editingItem ? "✏️ Editar Registro" : "🚀 Registrar Nuevo Elemento"}
            </h3>
            
            <form onSubmit={guardarDatos} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {activeTab === "fotocopias" ? "Título del Libro" : "Nombre del Establecimiento"}
                </label>
                <input
                  type="text" required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm"
                  value={formNombre} onChange={(e) => setFormNombre(e.target.value)}
                />
              </div>

              {activeTab !== "fotocopias" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Detalles / Descripción</label>
                    <textarea
                      rows={2} required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm"
                      value={formDetalles} onChange={(e) => setFormDetalles(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Enlace de Imagen (Google Drive)</label>
                    <input
                      type="text" required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm"
                      value={formImagenUrl} onChange={(e) => setFormImagenUrl(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Latitud</label>
                      <input
                        type="number" step="any" required
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm"
                        value={formLatitud} onChange={(e) => setFormLatitud(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Longitud</label>
                      <input
                        type="number" step="any" required
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm"
                        value={formLongitud} onChange={(e) => setFormLongitud(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === "fotocopias" && (
                <div>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded-sm focus:ring-blue-500"
                      checked={formDisponible} onChange={(e) => setFormDisponible(e.target.checked)}
                    />
                    Material Disponible en Inventario
                  </label>
                </div>
              )}

              {activeTab === "pensiones" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Precio Promedio (Ej: Bs. 12.00)</label>
                  <input
                    type="text" required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm"
                    value={formPrecio} onChange={(e) => setFormPrecio(e.target.value)}
                  />
                </div>
              )}

              {activeTab === "bibliotecas" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Salas Disponibles (Ej: 3 salas)</label>
                  <input
                    type="text" required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm"
                    value={formSalas} onChange={(e) => setFormSalas(e.target.value)}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button" onClick={() => setIsModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}