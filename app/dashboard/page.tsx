"use client";
import React, { useEffect, useState } from "react";
import { auth, db } from "@/firebase/config";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

// Definición estricta de la estructura del documento de Firestore
interface Libro {
  id: string;
  titulo: string;
  disponible: boolean;
}

export default function Dashboard() {
  const [libros, setLibros] = useState<Libro[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) router.push("/");
    });

    // Conexión reactiva a la subcolección que creaste en la consola de Firebase
    const librosRef = collection(db, "fotocopiadoras", "foto_central", "libros");
    const unsubscribeSnapshot = onSnapshot(librosRef, (snapshot) => {
      const listaLibros = snapshot.docs.map((doc) => ({
        id: doc.id,
        titulo: doc.data().titulo || "Sin título",
        disponible: typeof doc.data().disponible === "boolean" ? doc.data().disponible : false,
      })) as Libro[];
      
      setLibros(listaLibros);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSnapshot();
    };
  }, [router]);

  const toggleStock = async (libroId: string, estadoActual: boolean) => {
    try {
      const docRef = doc(db, "fotocopiadoras", "foto_central", "libros", libroId);
      await updateDoc(docRef, { disponible: !estadoActual });
    } catch (error) {
      alert("No se pudo actualizar el estado en Firestore.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col justify-between hidden md:flex">
        <div>
          <h2 className="text-xl font-bold tracking-wider mb-8 text-blue-400">U-PUNTO WEB</h2>
          <nav className="space-y-2">
            <span className="block px-4 py-2 rounded-xl bg-blue-600 font-semibold cursor-pointer">
              🖨️ Gestión Fotocopias
            </span>
          </nav>
        </div>
        <button 
          onClick={async () => { await auth.signOut(); router.push("/"); }}
          className="w-full bg-slate-800 hover:bg-red-900 text-red-400 font-bold py-2 px-4 rounded-xl transition text-sm"
        >
          Cerrar Sesión
        </button>
      </aside>

      <main className="flex-1 p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Panel de Control de Inventario</h1>
          <p className="text-sm text-slate-500 mt-1">Filtrando por: Fotocopiadora Campus Central</p>
        </header>

        {loading ? (
          <p className="text-slate-600 font-medium animate-pulse">Sincronizando con Firestore...</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm font-semibold">
                  <th className="p-4">Material Universitario</th>
                  <th className="p-4">Disponibilidad en App Móvil</th>
                  <th className="p-4 text-center">Acción Operativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {libros.map((libro) => (
                  <tr key={libro.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 font-medium text-slate-900">{libro.titulo}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        libro.disponible ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {libro.disponible ? "Disponible" : "Agotado"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => toggleStock(libro.id, libro.disponible)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition text-white ${
                          libro.disponible ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        {libro.disponible ? "Marcar Agotado" : "Habilitar Inventario"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}