import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreBar } from '@/components/ScoreBar';

describe('ScoreBar', () => {
  // --- Value rendering ---
  it('renders the numeric value', () => {
    render(<ScoreBar value={75} />);
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('renders 0 for value 0', () => {
    render(<ScoreBar value={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders 100 for value 100', () => {
    render(<ScoreBar value={100} />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('clamps negative values to 0', () => {
    render(<ScoreBar value={-10} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('clamps values above 100 to 100', () => {
    render(<ScoreBar value={150} />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  // --- Label ---
  it('renders the label when provided', () => {
    render(<ScoreBar value={50} label="Viabilidad" />);
    expect(screen.getByText('Viabilidad')).toBeInTheDocument();
  });

  // --- Color thresholds ---
  it('applies red color class for score < 40', () => {
    const { container } = render(<ScoreBar value={20} />);
    const bar = container.querySelector('.bg-red-500');
    expect(bar).toBeInTheDocument();
  });

  it('applies red text color for score < 40', () => {
    const { container } = render(<ScoreBar value={20} />);
    const text = container.querySelector('.text-red-400');
    expect(text).toBeInTheDocument();
  });

  it('applies yellow color class for score between 40 and 70', () => {
    const { container } = render(<ScoreBar value={55} />);
    const bar = container.querySelector('.bg-yellow-500');
    expect(bar).toBeInTheDocument();
  });

  it('applies yellow text color for score between 40 and 70', () => {
    const { container } = render(<ScoreBar value={55} />);
    const text = container.querySelector('.text-yellow-400');
    expect(text).toBeInTheDocument();
  });

  it('applies emerald color class for score > 70', () => {
    const { container } = render(<ScoreBar value={85} />);
    const bar = container.querySelector('.bg-emerald-500');
    expect(bar).toBeInTheDocument();
  });

  it('applies emerald text color for score > 70', () => {
    const { container } = render(<ScoreBar value={85} />);
    const text = container.querySelector('.text-emerald-400');
    expect(text).toBeInTheDocument();
  });

  // --- Boundary values ---
  it('applies red at score 39 (boundary)', () => {
    const { container } = render(<ScoreBar value={39} />);
    expect(container.querySelector('.bg-red-500')).toBeInTheDocument();
  });

  it('applies yellow at score 40 (boundary)', () => {
    const { container } = render(<ScoreBar value={40} />);
    expect(container.querySelector('.bg-yellow-500')).toBeInTheDocument();
  });

  it('applies yellow at score 70 (boundary)', () => {
    const { container } = render(<ScoreBar value={70} />);
    expect(container.querySelector('.bg-yellow-500')).toBeInTheDocument();
  });

  it('applies emerald at score 71 (boundary)', () => {
    const { container } = render(<ScoreBar value={71} />);
    expect(container.querySelector('.bg-emerald-500')).toBeInTheDocument();
  });

  // --- Bar width ---
  it('sets the bar width style to the clamped value percentage', () => {
    const { container } = render(<ScoreBar value={65} />);
    const innerBar = container.querySelector('[style]');
    expect(innerBar).toHaveStyle({ width: '65%' });
  });

  it('sets bar width to 0% for value 0', () => {
    const { container } = render(<ScoreBar value={0} />);
    const innerBar = container.querySelector('[style]');
    expect(innerBar).toHaveStyle({ width: '0%' });
  });

  it('sets bar width to 100% for value 100', () => {
    const { container } = render(<ScoreBar value={100} />);
    const innerBar = container.querySelector('[style]');
    expect(innerBar).toHaveStyle({ width: '100%' });
  });
});
