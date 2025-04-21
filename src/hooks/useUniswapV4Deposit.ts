import { Percent, Token as UniToken } from '@uniswap/sdk-core'
import { Pool as UniV4Pool, Position as UniV4Position, V4PositionManager } from '@uniswap/v4-sdk'
import { useCallback } from 'react'
import { usePublicClient, useWalletClient } from 'wagmi'

// Position Manager address
const POSITION_MANAGER_ADDRESS = '0x498581ff718922c3f8e6a244956af099b2652b2b' as `0x${string}`

/**
 * Hook: useSimpleUniswapV4Deposit
 * --------------------------------
 * Simplified hook to deposit into a Uniswap V4 pool
 */
export function useSimpleUniswapV4Deposit() {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  /**
   * deposit
   * -------
   * Deposits token amounts into a Uniswap V4 pool.
   *
   * @param token0 - First token details including amount to deposit
   * @param token1 - Second token details including amount to deposit
   * @param poolId - The ID of the pool (used as poolId in V4)
   * @returns Promise<`0x${string}`> resolves to transaction hash
   */
  const deposit = useCallback(
    async (
      token0: { address: string; decimals: number; symbol: string; amount: bigint },
      token1: { address: string; decimals: number; symbol: string; amount: bigint },
      poolId: string,
    ): Promise<`0x${string}`> => {
      if (!walletClient || !publicClient) {
        throw new Error('Wallet or public client not initialized')
      }

      // Configuration
      const SLIPPAGE_TOLERANCE = new Percent(50, 10000) // 0.50%
      const TICK_SPACING = 60
      const FEE = 300 // 0.3% fee

      // 1. Fetch chain ID
      const chainId = await publicClient.getChainId()

      // 2. Construct token instances
      const _token0 = new UniToken(
        chainId,
        token0.address as `0x${string}`,
        token0.decimals,
        token0.symbol,
      )
      const _token1 = new UniToken(
        chainId,
        token1.address as `0x${string}`,
        token1.decimals,
        token1.symbol,
      )

      // 3. Set tick bounds
      const tickLower = -TICK_SPACING * 10
      const tickUpper = TICK_SPACING * 10

      // 4. Calculate initial price (just a placeholder - would be better determined in production)
      const sqrtPriceX96 = Math.sqrt(1) * 2 ** 96

      // 5. Create a V4 pool instance
      const pool = new UniV4Pool(
        _token0,
        _token1,
        FEE,
        sqrtPriceX96,
        poolId,
        0, // Initial liquidity
        0, // Initial tick
        TICK_SPACING,
      )

      // 6. Create a position with the pool and desired ticks
      const position = new UniV4Position({
        pool,
        liquidity: 0,
        tickLower,
        tickUpper,
      })

      // 7. Convert token amounts to CurrencyAmount instances
      // const amount0Desired = CurrencyAmount.fromRawAmount(_token0, token0.amount.toString())
      // const amount1Desired = CurrencyAmount.fromRawAmount(_token1, token1.amount.toString())

      // // Calculate minimum amounts with slippage tolerance
      // const slippagePercent = Number.parseInt(SLIPPAGE_TOLERANCE.toFixed(0))
      // // const amount0Min = amount0Desired.multiply(new Percent(100 - slippagePercent, 100)).quotient
      // const amount1Min = amount1Desired.multiply(new Percent(100 - slippagePercent, 100)).quotient

      // 8. Generate mint parameters with createPool option
      const { calldata, value } = V4PositionManager.addCallParameters(position, {
        slippageTolerance: SLIPPAGE_TOLERANCE,
        recipient: walletClient.account.address,
        deadline: Math.floor(Date.now() / 1000) + 60 * 20,
        createPool: true,
        sqrtPriceX96: sqrtPriceX96.toString(),
        // Note: Options below match what's in the test file
      })

      // 9. Send transaction
      const txHash = await walletClient.sendTransaction({
        to: POSITION_MANAGER_ADDRESS,
        data: calldata as `0x${string}`,
        value: BigInt(value || 0),
        account: walletClient.account,
      })

      return txHash
    },
    [walletClient, publicClient],
  )

  return { deposit }
}
