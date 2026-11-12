import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Error 404</p>
        <h1>Esta página no existe</h1>
        <p className={styles.description}>
          Puede que la dirección haya cambiado o que el enlace esté incompleto.
        </p>
        <Link className={styles.link} href="/">
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
