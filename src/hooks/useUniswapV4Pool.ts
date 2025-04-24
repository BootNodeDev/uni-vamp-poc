/**
 * @fileoverview Hook to check if a Uniswap V4 pool exists for a given token pair,
 * fee tier, tick spacing, and hooks configuration.
 */

import { ZERO_ADDRESS } from '@balancer/sdk'
import type { Token } from '@uniswap/sdk-core'
import { TickMath, encodeSqrtRatioX96 } from '@uniswap/v3-sdk'
import { Pool } from '@uniswap/v4-sdk'
import JSBI from 'jsbi'
import { slice } from 'viem'
import { useReadContracts } from 'wagmi'

const JSBigInt = JSBI.BigInt
/**
 * Address of the Uniswap V4 Position Manager contract on the relevant network (e.g., Base Sepolia).
 */
export const V4_POSITION_MANAGER_ADDRESS_BASE = '0x7C5f5A4bBd8fD63184577525326123B519429bDc'
export const V4_STATE_VIEW_ADDRESS_BASE = '0xA3c0c9b65baD0b08107Aa264b0f3dB444b867A71'

/**
 * Minimal ABI for the V4 Position Manager contract, focusing on the `poolKeys` function.
 */
export const positionManagerABI = [
  {
    inputs: [{ internalType: 'bytes25', name: 'poolId', type: 'bytes25' }],
    name: 'poolKeys',
    outputs: [
      { internalType: 'address', name: 'currency0', type: 'address' },
      { internalType: 'address', name: 'currency1', type: 'address' },
      { internalType: 'uint24', name: 'fee', type: 'uint24' },
      { internalType: 'int24', name: 'tickSpacing', type: 'int24' },
      { internalType: 'address', name: 'hooks', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes[]', name: 'data', type: 'bytes[]' }],
    name: 'multicall',
    outputs: [{ internalType: 'bytes[]', name: 'results', type: 'bytes[]' }],
    stateMutability: 'payable',
    type: 'function',
  },
] as const

// getSlot0 ABI
const StateViewABI = [
  {
    inputs: [{ internalType: 'bytes32', name: 'poolId', type: 'bytes32' }],
    name: 'getSlot0',
    outputs: [
      { internalType: 'uint160', name: 'sqrtPriceX96', type: 'uint160' },
      { internalType: 'int24', name: 'tick', type: 'int24' },
      { internalType: 'uint24', name: 'protocolFee', type: 'uint24' },
      { internalType: 'uint24', name: 'lpFee', type: 'uint24' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'poolId', type: 'bytes32' }],
    name: 'getLiquidity',
    outputs: [{ internalType: 'uint128', name: 'liquidity', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

/**
 * Custom hook to check if a specific Uniswap V4 pool exists.
 *
 * It calculates the pool ID based on the provided tokens, fee, tick spacing, and hooks,
 * then uses wagmi's `useReadContract` hook to query the `poolKeys` mapping
 * on the V4 Position Manager contract.
 *
 * @param params The pool parameters
 * @param params.tokenA Object containing token and amount for first token
 * @param params.tokenA.token The first token in the pair
 * @param params.tokenA.amount The amount of first token (in wei)
 * @param params.tokenB Object containing token and amount for second token
 * @param params.tokenB.token The second token in the pair
 * @param params.tokenB.amount The amount of second token (in wei)
 * @returns An object containing:
 *  - `data`: The pool keys if pool exists, otherwise false
 *  - `isLoading`: Boolean indicating if the contract read is in progress
 *  - `error`: Any error encountered during the contract read
 */
export function useV4Pool({
  tokenA,
  tokenB,
}: {
  tokenA: { token: Token; amount: bigint }
  tokenB: { token: Token; amount: bigint }
}) {
  // Prepare ordered PoolKey parameters

  const [token0, token1] =
    tokenA.token.address.toLowerCase() < tokenB.token.address.toLowerCase()
      ? [tokenA, tokenB]
      : [tokenB, tokenA]

  // Sort amounts to ensure token0 is the smaller amount

  const fee = 100 // 0.01% fee
  const tickSpacing = 1 // fix value to match with the existing pool: https://basescan.org/address/0x7C5f5A4bBd8fD63184577525326123B519429bDc#code
  const hooks = ZERO_ADDRESS // No custom hooks

  // calculate the poolId from the token pair, fee, tick spacing, and hooks
  const poolId32Bytes = Pool.getPoolId(
    token0.token,
    token1.token,
    fee,
    tickSpacing,
    hooks,
  ) as `0x${string}`

  const poolId25Bytes = slice(poolId32Bytes, 0, 25) as `0x${string}`

  const {
    data: poolData, // returns poolKeys: { currency0, currency1, fee, tickSpacing, hooks }
    isLoading: isLoadingPoolData,
    error: errorPoolData,
  } = useReadContracts({
    contracts: [
      {
        address: V4_POSITION_MANAGER_ADDRESS_BASE,
        abi: positionManagerABI,
        functionName: 'poolKeys',
        args: [poolId25Bytes],
      },
      {
        address: V4_STATE_VIEW_ADDRESS_BASE,
        abi: StateViewABI,
        functionName: 'getSlot0',
        args: [poolId32Bytes],
      },
      {
        address: V4_STATE_VIEW_ADDRESS_BASE,
        abi: StateViewABI,
        functionName: 'getLiquidity',
        args: [poolId32Bytes],
      },
    ],
  })

  const poolKeysData = poolData?.[0]?.result
  const slot0Data = poolData?.[1]?.result
  const liquidityData = poolData?.[2]?.result

  const poolExists = poolKeysData && Number(poolKeysData[3]) > 0

  console.log({
    poolExists,
    token0Amount: token0.amount.toString(),
    token1Amount: token1.amount.toString(),
    sqrtPriceX96: encodeSqrtRatioX96(1, 1).toString(),
    slot0Data: slot0Data,
  })

  const sqrtPriceX96 =
    poolExists && slot0Data ? slot0Data[0].toString() : encodeSqrtRatioX96(1, 1).toString()
  const liquidity = liquidityData ? liquidityData.toString() : '0'

  const tickCurrent =
    poolExists && slot0Data
      ? Number(slot0Data?.[1])
      : TickMath.getTickAtSqrtRatio(JSBigInt(sqrtPriceX96))

  let pool: Pool | undefined
  try {
    pool = new Pool(
      token0.token,
      token1.token,
      fee,
      tickSpacing,
      hooks,
      sqrtPriceX96,
      liquidity,
      tickCurrent,
    )
    console.log('pool', pool)
  } catch (error) {
    console.error('Error creating pool', error)
  }

  return { data: pool, isLoading: isLoadingPoolData, error: errorPoolData }
}
