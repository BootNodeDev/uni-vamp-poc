import type { PoolToken } from '@/src/types/balancer'

// Keeping old interface for backward compatibility if needed
export interface UserTokenShare {
  symbol: string
  amount: number // User's share of this token
}

/**
 * Calculates the user's share of each token in a pool based on their LP token balance.
 *
 * @param userBalance - The number of LP tokens the user holds
 * @param totalShares - The total number of LP tokens issued by the pool
 * @param poolTokens - The total balance of each token in the pool
 * @returns Object mapping token symbols to user's share amounts
 */
export function calculateUserTokenShares(
  userBalance: number,
  totalShares: number,
  poolTokens: PoolToken[],
): Record<string, number> {
  if (totalShares === 0) {
    throw new Error('Total shares cannot be zero.')
  }

  const userShareRatio = userBalance / totalShares

  return poolTokens.reduce<Record<string, number>>((acc, token) => {
    acc[token.symbol] = Number(token.balance) * userShareRatio
    return acc
  }, {})
}
