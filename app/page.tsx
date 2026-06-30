import MapaPeru from "@/app/components/mapa-peru";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-12">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          SecurePeru — Denuncias Policiales del Perú
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-xl">
          Mapa coroplético interactivo. Haz clic en un departamento para ver sus
          provincias, y en una provincia para ver sus distritos. El panel de la
          derecha muestra la data de delitos de la zona y se actualiza a medida
          que entras más adentro (2018–2026).
        </p>
        <MapaPeru />
      </main>
    </div>
  );
}
