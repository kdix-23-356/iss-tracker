import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import type { IssState } from '@/types';

describe('Dashboard', () => {
  test('テレメトリが正しいフォーマットで表示されること', () => {
    const mockState: IssState = {
      speed: 7.66666,
      altitude: 400.123,
      latitude: 35.12345,
      longitude: 140.98765,
      timestamp: new Date(),
    };

    render(<Dashboard state={mockState} />);

    // 小数点以下の丸め処理が効いているか確認
    expect(screen.getByText('7.667 km/s')).toBeInTheDocument();
    expect(screen.getByText('400.12 km')).toBeInTheDocument();
    expect(screen.getByText('35.1235°')).toBeInTheDocument();
    expect(screen.getByText('140.9877°')).toBeInTheDocument();
  });
});