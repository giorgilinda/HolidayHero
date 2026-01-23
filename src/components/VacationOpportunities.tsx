"use client";

import React from 'react';
import { VacationOpportunity } from '@/utils/vacationOpportunities';
import styles from './VacationOpportunities.module.css';

interface VacationOpportunitiesProps {
  opportunities: VacationOpportunity[];
  onOpportunityClick?: (opportunity: VacationOpportunity) => void;
}

export const VacationOpportunities: React.FC<VacationOpportunitiesProps> = ({
  opportunities,
  onOpportunityClick,
}) => {
  if (opportunities.length === 0) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>🎯 Vacation Opportunities</h3>
        <p className={styles.emptyMessage}>No vacation opportunities found for this year.</p>
      </div>
    );
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateRange = (start: Date, end: Date): string => {
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>🎯 Vacation Opportunities</h3>
      <p className={styles.subtitle}>
        Take minimal PTO days for maximum vacation time
      </p>
      
      <div className={styles.opportunitiesList}>
        {opportunities.map((opp, index) => (
          <div
            key={index}
            className={styles.opportunityCard}
            onClick={() => onOpportunityClick?.(opp)}
          >
            <div className={styles.opportunityHeader}>
              <div className={styles.efficiencyBadge}>
                {opp.efficiency.toFixed(1)}x
              </div>
              <div className={styles.opportunityInfo}>
                <div className={styles.ptoDays}>
                  {opp.ptoDaysCount} PTO day{opp.ptoDaysCount !== 1 ? 's' : ''} = {opp.totalVacationDays} day{opp.totalVacationDays !== 1 ? 's' : ''} vacation
                </div>
                <div className={styles.description}>{opp.description}</div>
              </div>
            </div>
            
            <div className={styles.opportunityDetails}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Take off:</span>
                <span className={styles.detailValue}>
                  {opp.ptoDays.map(d => formatDate(d)).join(', ')}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Vacation period:</span>
                <span className={styles.detailValue}>
                  {formatDateRange(opp.vacationPeriod.start, opp.vacationPeriod.end)}
                </span>
              </div>
              {opp.holidays.length > 0 && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Holidays:</span>
                  <span className={styles.detailValue}>
                    {opp.holidays.map(h => h.name || formatDate(h.date)).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

