import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
      <section className="w-full max-w-xl rounded-3xl border border-slate-700 bg-slate-900 p-8 text-center shadow-2xl sm:p-14">
        <p className="mb-3 text-sm font-extrabold uppercase tracking-[0.2em] text-indigo-300">Error 404</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Esta página no existe</h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-slate-400">
          Puede que la dirección haya cambiado o que el enlace esté incompleto.
        </p>
        <Link
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-indigo-500 px-6 py-3 font-bold text-white transition hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-300"
          href="/"
        >
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
