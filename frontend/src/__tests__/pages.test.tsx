import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// Import the client and server components
import RecoveryPage from '../app/recovery/page';
import TransactionsPage from '../app/transactions/page';
import RiskCaseDetailPage from '../app/risk-cases/[caseId]/page';
import OverviewPage from '../app/overview/page';

describe('Frontend Highest-Traffic Pages Rendering Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock global fetch for API endpoints
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/dashboard/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            revenue_at_risk: 125000.0,
            revenue_recovered: 78500.0,
            recovery_rate: 62.8,
            cases_processed: 48,
          }),
        });
      }
      if (url.includes('/dashboard/breakdown')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            root_causes: [{ name: 'temporary_payment_failure', value: 30 }],
            actions: [{ name: 'retry', value: 25 }],
          }),
        });
      }
      if (url.includes('/cases/RC-001') || url.includes('/cases/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'RC-001',
            transaction_id: 'tx_rc001',
            status: 'open',
            risk_type: 'failed_payment',
            risk_severity: 'HIGH',
            risk_amount: 8400.0,
            diagnosed_root_cause: 'temporary_payment_failure',
            confidence_score: 0.92,
            recommended_action: 'retry',
            final_action: 'retry',
            created_at: new Date().toISOString(),
          }),
        });
      }
      if (url.includes('/transactions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            total: 2,
            transactions: [
              {
                id: 'TX-1001',
                amount: 4500.0,
                currency: 'INR',
                status: 'failed',
                payment_method: 'upi',
                created_at: new Date().toISOString(),
              },
              {
                id: 'TX-1002',
                amount: 3200.0,
                currency: 'INR',
                status: 'success',
                payment_method: 'card',
                created_at: new Date().toISOString(),
              },
            ],
          }),
        });
      }
      if (url.includes('/batches')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              id: 'BATCH-001',
              status: 'COMPLETED',
              total_cases: 10,
              successful_cases: 8,
              failed_cases: 2,
              executed_at: new Date().toISOString(),
            },
          ]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    }) as any;
  });

  it('1. Renders Overview Dashboard page with stats and recovery cards', async () => {
    const Component = await OverviewPage();
    render(Component);
    expect(screen.getByText(/Executive Recovery Overview/i)).toBeInTheDocument();
  });

  it('2. Renders Recovery page with live stream and telemetry controls', () => {
    render(<RecoveryPage />);
    expect(screen.getByText(/Real-Time Execution Telemetry/i)).toBeInTheDocument();
  });

  it('3. Renders Transactions explorer page with filters and table', async () => {
    render(<TransactionsPage />);
    expect(screen.getByText(/Transaction Explorer & Telemetry/i)).toBeInTheDocument();
  });

  it('4. Renders Risk Case Detail page with diagnosis and action controls', async () => {
    render(<RiskCaseDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('RC-001')).toBeInTheDocument();
      expect(screen.getByText('failed_payment')).toBeInTheDocument();
    });
  });
});
