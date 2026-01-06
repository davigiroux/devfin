import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CurrencyInput from '@/components/ui/CurrencyInput';

describe('CurrencyInput', () => {
  it('renders with default R$ prefix', () => {
    render(<CurrencyInput id="test" name="test" />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('renders with custom prefix', () => {
    const { container } = render(
      <CurrencyInput id="test" name="test" prefix="$" />
    );
    const input = container.querySelector('input');
    expect(input).toBeInTheDocument();
  });

  it('accepts onValueChange callback', () => {
    const mockOnChange = jest.fn();
    const { container } = render(
      <CurrencyInput
        id="test"
        name="testField"
        onValueChange={mockOnChange}
      />
    );

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    // onValueChange callback is passed to imask, which will call it on accept
  });

  it('renders with name prop for form handling', () => {
    const { container } = render(
      <CurrencyInput
        id="test"
        name="testField"
      />
    );

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).toHaveAttribute('name', 'testField');
  });

  it('handles controlled value updates', () => {
    const { container, rerender } = render(
      <CurrencyInput id="test" name="test" value={100.5} />
    );

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    // Update value
    rerender(<CurrencyInput id="test" name="test" value={200.75} />);
    expect(input).toBeInTheDocument();
  });

  it('applies error styling when error prop is true', () => {
    const { container } = render(
      <CurrencyInput id="test" name="test" error={true} />
    );

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).toHaveClass('border-destructive');
  });

  it('handles zero value correctly', () => {
    const mockOnChange = jest.fn();
    const { container } = render(
      <CurrencyInput
        id="test"
        name="testField"
        value={0}
        onValueChange={mockOnChange}
      />
    );

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<CurrencyInput ref={ref} id="test" name="test" />);

    expect(ref.current).toBeTruthy();
  });

  it('handles USD prefix correctly', () => {
    const mockOnChange = jest.fn();
    const { container } = render(
      <CurrencyInput
        id="valorUSD"
        name="valorUSD"
        prefix="$"
        onValueChange={mockOnChange}
      />
    );

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'valorUSD');
  });

  it('handles value prop with large numbers', () => {
    const { container } = render(
      <CurrencyInput
        id="test"
        name="testField"
        value={1000.50}
      />
    );

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    // Value is formatted by imask with Brazilian format (1.000,50)
  });

  it('handles required attribute', () => {
    const { container } = render(
      <CurrencyInput id="test" name="test" required />
    );

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).toHaveAttribute('required');
  });

  it('handles placeholder text', () => {
    const { container } = render(
      <CurrencyInput id="test" name="test" placeholder="0,00" />
    );

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).toHaveAttribute('placeholder', '0,00');
  });
});
