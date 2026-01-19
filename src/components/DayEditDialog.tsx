"use client";

import React, { useState, useEffect } from 'react';
import classNames from 'classnames';
import styles from './DayEditDialog.module.css';

export interface Person {
  id: string;
  name: string;
}

export interface ManualOverride {
  date: string;
  people: Record<string, 'vacation' | 'wfh' | 'activity'>; // Map of person ID to type
}

interface DayEditDialogProps {
  isOpen: boolean;
  date: Date | null;
  people: Person[];
  existingOverride: ManualOverride | null;
  onClose: () => void;
  onSave: (override: ManualOverride) => void;
  onDelete: () => void;
}

export const DayEditDialog: React.FC<DayEditDialogProps> = ({
  isOpen,
  date,
  people,
  existingOverride,
  onClose,
  onSave,
  onDelete,
}) => {
  const [peopleTypes, setPeopleTypes] = useState<Record<string, 'vacation' | 'wfh' | 'activity'>>({});

  useEffect(() => {
    if (isOpen && existingOverride) {
      setPeopleTypes(existingOverride.people);
    } else if (isOpen) {
      setPeopleTypes({});
    }
  }, [isOpen, existingOverride]);

  if (!isOpen || !date) return null;

  // Format date as YYYY-MM-DD to match calendar format (using local timezone)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;
  
  const formattedDate = date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const handlePersonToggle = (personId: string, type: 'vacation' | 'wfh' | 'activity') => {
    setPeopleTypes(prev => {
      const newTypes = { ...prev };
      if (newTypes[personId] === type) {
        // If clicking the same type, remove the person
        delete newTypes[personId];
      } else {
        // Otherwise, set the person to the selected type
        newTypes[personId] = type;
      }
      return newTypes;
    });
  };

  const handleSave = () => {
    const selectedPeople = Object.keys(peopleTypes);
    if (selectedPeople.length === 0) {
      alert('Please select at least one person');
      return;
    }

    onSave({
      date: dateString,
      people: peopleTypes,
    });
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this override?')) {
      onDelete();
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Edit Day: {formattedDate}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <label className={styles.label}>Select People and Type:</label>
            <div className={styles.peopleList}>
              {people.map((person) => {
                const currentType = peopleTypes[person.id];
                return (
                  <div key={person.id} className={styles.personRow}>
                    <div className={styles.personName}>{person.name}</div>
                    <div className={styles.personTypeButtons}>
                      <button
                        type="button"
                        className={classNames(
                          styles.typeButton,
                          currentType === 'vacation' && styles.typeButtonActive
                        )}
                        onClick={() => handlePersonToggle(person.id, 'vacation')}
                      >
                        🏖️ Vacation
                      </button>
                      <button
                        type="button"
                        className={classNames(
                          styles.typeButton,
                          currentType === 'wfh' && styles.typeButtonActive
                        )}
                        onClick={() => handlePersonToggle(person.id, 'wfh')}
                      >
                        🏠 WFH
                      </button>
                      <button
                        type="button"
                        className={classNames(
                          styles.typeButton,
                          styles.typeButtonActivity,
                          currentType === 'activity' && styles.typeButtonActivityActive
                        )}
                        onClick={() => handlePersonToggle(person.id, 'activity')}
                      >
                        🎨 Activity
                      </button>
                      {currentType && (
                        <button
                          type="button"
                          className={styles.removeButton}
                          onClick={() => {
                            setPeopleTypes(prev => {
                              const newTypes = { ...prev };
                              delete newTypes[person.id];
                              return newTypes;
                            });
                          }}
                          title="Remove person"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          {existingOverride && Object.keys(existingOverride.people).length > 0 && (
            <button className={styles.deleteButton} onClick={handleDelete}>
              Delete All
            </button>
          )}
          <div className={styles.actionButtons}>
            <button className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button className={styles.saveButton} onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

