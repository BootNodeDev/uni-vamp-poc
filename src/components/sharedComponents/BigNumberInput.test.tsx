import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { parseUnits } from 'viem'
import { describe, expect, it, vi } from 'vitest'

import {
  BigNumberInput,
  type RenderInputProps,
} from '@/src/components/sharedComponents/BigNumberInput'

type BigNumberInputProps = Parameters<typeof BigNumberInput>[0]

// Mocking viem's parseUnits and formatUnits functions
vi.mock('viem', () => ({
  formatUnits: (value: bigint, decimals: number) =>
    // biome-ignore lint/style/useExponentiationOperator: <explanation>
    (Number(value) / Math.pow(10, decimals)).toFixed(decimals),
  parseUnits: (value: string, decimals: number) =>
    // biome-ignore lint/style/useExponentiationOperator: <explanation>
    BigInt(Math.round(Number(value) * Math.pow(10, decimals))),
  maxUint256: 2n ** 256n - 1n,
}))

describe('BigNumberInput', () => {
  const setup = (props: Partial<BigNumberInputProps> = {}) => {
    const defaultProps: BigNumberInputProps = {
      decimals: 18,
      onChange: vi.fn(),
      value: 0n,
      ...props,
    }

    return {
      user: userEvent.setup(),
      ...render(<BigNumberInput {...defaultProps} />),
    }
  }

  it('renders correctly with default props', () => {
    setup()
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument()
  })

  it('handles autofocus correctly', () => {
    setup({ autofocus: true })
    const input = screen.getByPlaceholderText('0.00')
    expect(document.activeElement).toBe(input)
  })

  it('updates value onChange', async () => {
    const handleChange = vi.fn()
    const { user } = setup({ onChange: handleChange })

    const input = screen.getByPlaceholderText('0.00')
    input.focus()
    await user.paste('1.23')
    expect(handleChange).toHaveBeenCalledWith(parseUnits('1.23', 18))
  })

  it('displays formatted value based on decimals', () => {
    setup({ value: parseUnits('1.234', 2), decimals: 2 })
    const input = screen.getByPlaceholderText('0.00')
    expect(input).toHaveValue('1.23')
  })

  it('triggers error on value less than min', async () => {
    const handleError = vi.fn()
    const { user } = setup({
      min: parseUnits('1', 2),
      decimals: 2,
      onError: handleError,
    })

    const input = screen.getByPlaceholderText('0.00')
    input.focus()
    await user.paste('0.50')
    expect(handleError).toHaveBeenCalledWith({
      value: '0.50',
      message: 'Invalid value! Range: [1.00, maxUint256] and value is: 0.50',
    })
  })

  it('triggers error on value more than max', async () => {
    const handleError = vi.fn()
    const { user } = setup({
      max: parseUnits('2', 2),
      decimals: 2,
      onError: handleError,
    })

    const input = screen.getByPlaceholderText('0.00')
    input.focus()
    await user.paste('3.00')
    expect(handleError).toHaveBeenCalledWith({
      value: '3.00',
      message: 'Invalid value! Range: [0.00, 2.00] and value is: 3.00',
    })
  })

  it('removes the error after correcting the value', async () => {
    const handleError = vi.fn()
    const { user } = setup({
      max: parseUnits('2', 2),
      decimals: 2,
      onError: handleError,
    })

    const input = screen.getByPlaceholderText('0.00')
    input.focus()
    await user.paste('3.00')
    expect(handleError).toHaveBeenCalledWith({
      value: '3.00',
      message: 'Invalid value! Range: [0.00, 2.00] and value is: 3.00',
    })

    await user.clear(input)
    await user.paste('1.00')
    expect(handleError).toHaveBeenCalledOnce()
  })

  it('displays custom rendered input', () => {
    const customRenderInput = ({ inputRef, ...props }: RenderInputProps) => (
      <input
        data-testid="custom-input"
        ref={inputRef}
        {...props}
      />
    )
    setup({ renderInput: customRenderInput })
    expect(screen.getByTestId('custom-input')).toBeInTheDocument()
  })

  it('resets input value when cleared', async () => {
    const handleChange = vi.fn()
    setup({ onChange: handleChange, value: parseUnits('1.123', 2) })
    const user = userEvent.setup()

    const input = screen.getByPlaceholderText('0.00')
    await user.clear(input)
    expect(input).toHaveValue('')
  })
})
