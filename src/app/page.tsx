import React from "react";
import styles from "./page.module.css";
import { VacationCalendar } from "@/components/VacationCalendar";

export default function Home() {
  
  return (
    <div className={styles.container}>
      <main>
        <VacationCalendar />
      </main>
    </div>
  );
}
