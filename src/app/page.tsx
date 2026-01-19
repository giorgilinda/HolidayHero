import React from "react";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to <span className={styles.highlight}>Next.js</span>
        </h1>

        <p className={styles.description}>
          Get started by editing{" "}
          <code className={styles.code}>src/app/page.tsx</code>
        </p>

        <div className={styles.grid}>
          <div className={styles.card}>
            <h2>Documentation &rarr;</h2>
            <p>Find in-depth information about Next.js features and API.</p>
          </div>

          <div className={styles.card}>
            <h2>Learn &rarr;</h2>
            <p>Learn about Next.js in an interactive course with quizzes!</p>
          </div>

          <div className={styles.card}>
            <h2>Templates &rarr;</h2>
            <p>Explore starter templates for Next.js.</p>
          </div>

          <div className={styles.card}>
            <h2>Deploy &rarr;</h2>
            <p>
              Instantly deploy your Next.js site to a shareable URL with Vercel.
            </p>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>Made with ❤️ using Next.js Boilerplate</p>
      </footer>
    </div>
  );
}
