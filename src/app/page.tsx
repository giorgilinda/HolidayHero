"use client";

import React from "react";
import styles from "./page.module.css";
import { VacationCalendar } from "@/components/VacationCalendar";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";

export default function Home() {
  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <main>
          <VacationCalendar />
        </main>
      </div>
    </ProtectedRoute>
  );
}
