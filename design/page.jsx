'use client';

import { useState } from 'react';
import ClearSkyIntakeForm from '@/components/ClearSkyIntakeForm';
import ClearSkyResultsModal from '@/components/ClearSkyResultsModal';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState(null);
  const [error, setError] = useState(null);

  async function handleFormSubmit(formData) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Diagnostic failed: ${response.status}`);
      }

      const results = await response.json();
      setDiagnosticResults(results);
      setModalOpen(true);
    } catch (err) {
      console.error('Diagnostic error:', err);
      setError('Something went wrong running the diagnostic. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleCTA({ businessName, scenarioData }) {
    // TODO Session 12+: wire to booking destination once URL confirmed by Rory.
    // Options:
    //   router.push('/book')                         — internal Next.js booking page
    //   window.open(calendlyUrl, '_blank')           — Calendly or similar
    //   submitLeadToCRM({ businessName, scenarioData }) — direct CRM handoff
    console.log('CTA clicked:', { businessName, scenarioData });
  }

  function handleConfirmInputs({ confidenceData }) {
    // Rep mode: re-run calcScenarioRecovery with confirmed inputs
    // and call setDiagnosticResults(updatedResults) to re-render modal live
    console.log('Rep confirmed inputs:', confidenceData);
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#06080e',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 16px',
    }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 40, maxWidth: 600 }}>
        <p style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#4a5168',
          marginBottom: 12,
        }}>
          ClearSky Digital Health Diagnostic
        </p>
        <h1 style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: 'clamp(28px, 5vw, 44px)',
          color: '#e8eaf0',
          lineHeight: 1.15,
          margin: '0 0 16px',
        }}>
          Find out what your digital gaps<br />are costing you
        </h1>
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 15,
          color: '#7c8399',
          lineHeight: 1.6,
          margin: 0,
        }}>
          A 90-second diagnostic that analyses your complete digital presence
          and produces a personalised revenue gap analysis — expressed in dollars.
        </p>
      </div>

      {/* Intake form */}
      <ClearSkyIntakeForm
        onSubmit={handleFormSubmit}
        isLoading={isLoading}
      />

      {/* Error state */}
      {error && (
        <p style={{
          marginTop: 16,
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 13,
          color: '#ff5c72',
          textAlign: 'center',
        }}>
          {error}
        </p>
      )}

      {/* Results modal */}
      <ClearSkyResultsModal
        isOpen={modalOpen}
        data={diagnosticResults}
        onClose={() => setModalOpen(false)}
        onCTA={handleCTA}
        onConfirmInputs={handleConfirmInputs}
      />
    </main>
  );
}
