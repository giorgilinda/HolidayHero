import React from "react";
import styles from "./Card.module.css";

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, title, className }) => {
  return (
    <div className={`${styles.card} ${className || ""}`}>
      {title && <h2 className={styles.title}>{title}</h2>}
      {children}
    </div>
  );
};
