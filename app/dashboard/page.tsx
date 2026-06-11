"use client";

import React, { useEffect, useState } from "react";
import { auth, db } from "@/firebase/config";
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, DocumentData } from "firebase/firestore";
import { useRouter } from "next/navigation";

interface Fotocopiadora {
  id: string;
  nombre: string;
  ubicacion_detalle: string;
  latitud: number;
  longitud: number;
  imagen_url?: string;
}

interface Libro {
  id: string;
  titulo: string;
  disponible: boolean;
}

interface CentroAcademico {
  id: string;
  nombre: string;
  detalles: string;
  imagen_url?: string;
  latitud: number;
  longitud: number;
  precio_promedio?: string;
  salas_disponibles?: string;
}

type SeccionModulo = "fotocopias" | "salud" | "pensiones" | "bibliotecas";
type TipoFormulario = "tienda" | "libro" | "general";

export default function DashboardAdmin() {
  const router = useRouter();
  const [seccionActual, setSeccionActual] = useState<SeccionModulo>("fotocopias");
  const [estaCargando, setEstaCargando] = useState<boolean>(true);
  
  // Nuevo estado para el menú responsivo en móviles
  const [menuMovilAbierto, setMenuMovilAbierto] = useState<boolean>(false);

  const [tiendas, setTiendas] = useState<Fotocopiadora[]>([]);
  const [libros, setLibros] = useState<Libro[]>([]);
  const [centros, setCentros] = useState<CentroAcademico[]>([]);

  const [tiendaSeleccionada, setTiendaSeleccionada] = useState<Fotocopiadora | null>(null);

  const [modalAbierto, setModalAbierto] = useState<boolean>(false);
  const [tipoFormulario, setTipoFormulario] = useState<TipoFormulario>("general");
  const [registroEnEdicion, setRegistroEnEdicion] = useState<Fotocopiadora | Libro | CentroAcademico | null>(null);

  const [inputNombre, setInputNombre] = useState("");
  const [inputDetalles, setInputDetalles] = useState("");
  const [inputImagenUrl, setInputImagenUrl] = useState("");
  const [inputLatitud, setInputLatitud] = useState("");
  const [inputLongitud, setInputLongitud] = useState("");
  const [inputDisponible, setInputDisponible] = useState(true);
  const [inputMetadata, setInputMetadata] = useState("");

  useEffect(() => {
    const desvincularAuth = auth.onAuthStateChanged((usuario) => {
      if (!usuario) router.push("/");
    });

    if (seccionActual === "fotocopias") {
      if (!tiendaSeleccionada) {
        const refTiendas = collection(db, "fotocopiadoras");
        const desvincularTiendas = onSnapshot(refTiendas, (snapshot) => {
          setTiendas(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Fotocopiadora[]);
          setEstaCargando(false);
        });
        return () => { desvincularAuth(); desvincularTiendas(); };
      } else {
        const refLibros = collection(db, "fotocopiadoras", tiendaSeleccionada.id, "libros");
        const desvincularLibros = onSnapshot(refLibros, (snapshot) => {
          setLibros(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Libro[]);
          setEstaCargando(false);
        });
        return () => { desvincularAuth(); desvincularLibros(); };
      }
    } else {
      const rutaColeccion = seccionActual === "salud" ? "centros_salud" : seccionActual;
      const refCentros = collection(db, rutaColeccion);
      const desvincularCentros = onSnapshot(refCentros, (snapshot) => {
        setCentros(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as CentroAcademico[]);
        setEstaCargando(false);
      });
      return () => { desvincularAuth(); desvincularCentros(); };
    }
  }, [seccionActual, tiendaSeleccionada, router]);

  const configurarFormulario = (tipo: TipoFormulario, elemento: Fotocopiadora | Libro | CentroAcademico | null = null) => {
    setRegistroEnEdicion(elemento);
    setTipoFormulario(tipo);

    if (elemento) {
      if ("nombre" in elemento && elemento.nombre) setInputNombre(elemento.nombre);
      else if ("titulo" in elemento && elemento.titulo) setInputNombre(elemento.titulo);
      else setInputNombre("");

      if ("detalles" in elemento && elemento.detalles) setInputDetalles(elemento.detalles);
      else if ("ubicacion_detalle" in elemento && elemento.ubicacion_detalle) setInputDetalles(elemento.ubicacion_detalle);
      else setInputDetalles("");

      if ("imagen_url" in elemento && elemento.imagen_url) setInputImagenUrl(elemento.imagen_url);
      else setInputImagenUrl("");

      if ("latitud" in elemento && elemento.latitud != null) setInputLatitud(String(elemento.latitud));
      else setInputLatitud("");
      if ("longitud" in elemento && elemento.longitud != null) setInputLongitud(String(elemento.longitud));
      else setInputLongitud("");

      if ("disponible" in elemento) setInputDisponible(elemento.disponible ?? true);
      else setInputDisponible(true);

      if ("precio_promedio" in elemento && elemento.precio_promedio) setInputMetadata(String(elemento.precio_promedio));
      else if ("salas_disponibles" in elemento && elemento.salas_disponibles) setInputMetadata(String(elemento.salas_disponibles));
      else setInputMetadata("");
    } else {
      setInputNombre("");
      setInputDetalles("");
      setInputImagenUrl("");
      setInputLatitud("");
      setInputLongitud("");
      setInputDisponible(true);
      setInputMetadata("");
    }
    setModalAbierto(true);
  };

  const procesarFormulario = async (e: React.FormEvent) => {
    e.preventDefault();
    setEstaCargando(true);

    let referenciaColeccion;
    const datosEnvio: DocumentData = {};

    if (tipoFormulario === "tienda") {
      referenciaColeccion = collection(db, "fotocopiadoras");
      datosEnvio.nombre = inputNombre;
      datosEnvio.ubicacion_detalle = inputDetalles;
      datosEnvio.imagen_url = inputImagenUrl;
      datosEnvio.latitud = parseFloat(inputLatitud) || 0;
      datosEnvio.longitud = parseFloat(inputLongitud) || 0;
    } else if (tipoFormulario === "libro" && tiendaSeleccionada) {
      referenciaColeccion = collection(db, "fotocopiadoras", tiendaSeleccionada.id, "libros");
      datosEnvio.titulo = inputNombre;
      datosEnvio.disponible = inputDisponible;
    } else {
      const path = seccionActual === "salud" ? "centros_salud" : seccionActual;
      referenciaColeccion = collection(db, path);
      datosEnvio.nombre = inputNombre;
      datosEnvio.detalles = inputDetalles;
      datosEnvio.imagen_url = inputImagenUrl;
      datosEnvio.latitud = parseFloat(inputLatitud) || 0;
      datosEnvio.longitud = parseFloat(inputLongitud) || 0;

      if (seccionActual === "pensiones") datosEnvio.precio_promedio = inputMetadata;
      if (seccionActual === "bibliotecas") datosEnvio.salas_disponibles = inputMetadata;
    }

    try {
      if (registroEnEdicion) {
        const docRef = doc(db, referenciaColeccion.path, registroEnEdicion.id);
        await updateDoc(docRef, datosEnvio);
      } else {
        await addDoc(referenciaColeccion, datosEnvio);
      }
      setModalAbierto(false);
    } catch (err) {
      alert("Error en la persistencia de datos.");
    } finally {
      setEstaCargando(false);
    }
  };

  const ejecutarEliminacion = async (id: string, esLibro: boolean = false) => {
    if (!confirm("¿Confirmas la eliminación permanente de este registro?")) return;
    setEstaCargando(true);

    try {
      let pathDoc = "";
      if (esLibro && tiendaSeleccionada) {
        pathDoc = `fotocopiadoras/${tiendaSeleccionada.id}/libros/${id}`;
      } else if (seccionActual === "fotocopias") {
        pathDoc = `fotocopiadoras/${id}`;
      } else {
        const moduloPath = seccionActual === "salud" ? "centros_salud" : seccionActual;
        pathDoc = `${moduloPath}/${id}`;
      }

      await deleteDoc(doc(db, pathDoc));
    } catch (err) {
      alert("Error al intentar dar de baja el registro.");
    } finally {
      setEstaCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans antialiased relative">
      
      {/* OVERLAY FONDO OSCURO PARA MÓVILES */}
      {menuMovilAbierto && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 md:hidden transition-opacity" 
          onClick={() => setMenuMovilAbierto(false)} 
        />
      )}

      {/* MENÚ LATERAL RESPONSIVO */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-200 p-6 flex flex-col justify-between shadow-2xl transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${menuMovilAbierto ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div>
          <div className="mb-10 text-center flex items-center justify-between md:block">
            <div className="w-full">
              <h2 className="text-xl font-bold text-white tracking-tight">U-PUNTO SUCRE</h2>
              <p className="text-xs text-blue-400 mt-1 font-medium">Consola de Administración</p>
            </div>
            {/* Botón cerrar solo visible en móviles */}
            <button 
              onClick={() => setMenuMovilAbierto(false)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <nav className="space-y-1.5">
            {[
              { id: "fotocopias", label: "Directorio de Fotocopias" },
              { id: "salud", label: "Módulo de Salud" },
              { id: "pensiones", label: "Módulo de Pensiones" },
              { id: "bibliotecas", label: "Red de Bibliotecas" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { 
                  setSeccionActual(tab.id as SeccionModulo); 
                  setTiendaSeleccionada(null); 
                  setMenuMovilAbierto(false); 
                }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${seccionActual === tab.id ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <button
          onClick={async () => { await auth.signOut(); router.push("/"); }}
          className="w-full bg-slate-800 hover:bg-red-950 text-red-400 hover:text-red-200 font-bold py-3 rounded-xl transition duration-200 text-xs uppercase tracking-wider mt-6"
        >
          Cerrar Sesión
        </button>
      </aside>

      {/* CONTENEDOR PRINCIPAL */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto w-full">
        <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 pb-5 border-b border-slate-200">
          
          <div className="flex items-center gap-3">
            {/* BOTÓN HAMBURGUESA PARA MÓVILES */}
            <button 
              onClick={() => setMenuMovilAbierto(true)}
              className="md:hidden p-2.5 bg-white rounded-lg border border-slate-200 text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            <div>
              {seccionActual === "fotocopias" && tiendaSeleccionada ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <button 
                    onClick={() => setTiendaSeleccionada(null)}
                    className="bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition self-start"
                  >
                    Volver a Sucursales
                  </button>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-800">Inventario: {tiendaSeleccionada.nombre}</h1>
                </div>
              ) : (
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">
                  Gestión de {seccionActual === "salud" ? "Centros de Salud" : seccionActual}
                </h1>
              )}
              <p className="text-xs text-slate-500 mt-1 font-medium hidden sm:block">Sincronización bidireccional activa con la base de datos central</p>
            </div>
          </div>
          
          <button
            onClick={() => configurarFormulario(seccionActual === "fotocopias" ? (tiendaSeleccionada ? "libro" : "tienda") : "general")}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl shadow-md transition duration-200 text-center"
          >
            {seccionActual === "fotocopias" && tiendaSeleccionada ? "Agregar Libro" : "Registrar Elemento"}
          </button>
        </header>

        {/* TABLA DE REGISTROS CON SCROLL HORIZONTAL */}
        {estaCargando ? (
          <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold py-4">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span> Sincronizando datos con el servidor...
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="p-4 w-1/3">Elemento Registrado</th>
                    <th className="p-4 w-1/3">Detalles y Atributos</th>
                    <th className="p-4 text-center w-1/3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                  
                  {seccionActual === "fotocopias" && tiendaSeleccionada && libros.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 font-semibold text-slate-900">{l.titulo}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${l.disponible ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                          {l.disponible ? "Disponible" : "Agotado"}
                        </span>
                      </td>
                      <td className="p-4 text-center flex justify-center gap-2">
                        <button onClick={() => configurarFormulario("libro", l)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition">Editar</button>
                        <button onClick={() => ejecutarEliminacion(l.id, true)} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition">Eliminar</button>
                      </td>
                    </tr>
                  ))}

                  {seccionActual === "fotocopias" && !tiendaSeleccionada && tiendas.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 font-semibold text-slate-900">{t.nombre}</td>
                      <td className="p-4 text-slate-500 truncate max-w-[200px]">{t.ubicacion_detalle}</td>
                      <td className="p-4 text-center flex justify-center gap-2">
                        <button onClick={() => setTiendaSeleccionada(t)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-200 transition">Inventario</button>
                        <button onClick={() => configurarFormulario("tienda", t)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition">Editar</button>
                        <button onClick={() => ejecutarEliminacion(t.id)} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition">Eliminar</button>
                      </td>
                    </tr>
                  ))}

                  {seccionActual !== "fotocopias" && centros.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 font-semibold text-slate-900">{c.nombre}</td>
                      <td className="p-4 text-slate-500 max-w-[200px] truncate">
                        {seccionActual === "pensiones" && `Precio: ${c.precio_promedio || "N/D"} | `}
                        {seccionActual === "bibliotecas" && `Capacidad: ${c.salas_disponibles || "N/D"} | `}
                        {c.detalles}
                      </td>
                      <td className="p-4 text-center flex justify-center gap-2">
                        <button onClick={() => configurarFormulario("general", c)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition">Editar</button>
                        <button onClick={() => ejecutarEliminacion(c.id)} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL ADAPTATIVO SCROLLABLE */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
              {registroEnEdicion ? "Actualizar Registro" : "Crear Nuevo Registro"}
            </h3>
            
            <form onSubmit={procesarFormulario} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  {tipoFormulario === "libro" ? "Título de la Obra o Apunte" : "Nombre Institucional"}
                </label>
                <input
                  type="text" required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  value={inputNombre} onChange={(e) => setInputNombre(e.target.value)}
                />
              </div>

              {tipoFormulario !== "libro" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Descripción o Ubicación</label>
                    <textarea
                      rows={2} required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                      value={inputDetalles} onChange={(e) => setInputDetalles(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">URL de Imagen (Enlace Directo)</label>
                    <input
                      type="text" required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                      value={inputImagenUrl} onChange={(e) => setInputImagenUrl(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Latitud Decimal</label>
                      <input
                        type="number" step="any" required
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                        value={inputLatitud} onChange={(e) => setInputLatitud(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Longitud Decimal</label>
                      <input
                        type="number" step="any" required
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                        value={inputLongitud} onChange={(e) => setInputLongitud(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              {tipoFormulario === "libro" && (
                <div className="pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold uppercase text-slate-600">
                    <input
                      type="checkbox"
                      className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      checked={inputDisponible} onChange={(e) => setInputDisponible(e.target.checked)}
                    />
                    Disponibilidad de Inventario Activa
                  </label>
                </div>
              )}

              {seccionActual === "pensiones" && tipoFormulario === "general" && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Costo de Almuerzo (Ej: Bs. 5.00)</label>
                  <input
                    type="text" required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    value={inputMetadata} onChange={(e) => setInputMetadata(e.target.value)}
                  />
                </div>
              )}

              {seccionActual === "bibliotecas" && tipoFormulario === "general" && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Salas Disponibles (Ej: 3 salas)</label>
                  <input
                    type="text" required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    value={inputMetadata} onChange={(e) => setInputMetadata(e.target.value)}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button" onClick={() => setModalAbierto(false)}
                  className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wide transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wide transition shadow-md shadow-blue-900/10"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}