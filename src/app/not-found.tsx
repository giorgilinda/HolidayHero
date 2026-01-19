import React from "react";
import styles from "./not-found.module.css";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>404</h1>
      <p className={styles.description}>Page not found</p>
      <Link href="/" className={styles.link}>
        Go back home
      </Link>
    </div>
  );
}
