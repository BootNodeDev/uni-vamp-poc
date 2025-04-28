import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'

import { useWeb3Status } from '@/src/hooks/useWeb3Status'
import {
  StateViewABI,
  V4_POSITION_MANAGER_ADDRESS_BASE,
  V4_STATE_VIEW_ADDRESS_BASE,
  decodePositionInfo,
  fetchPositions,
  getPoolIdFromPoolKey,
  positionManagerABI,
} from '@/src/utils/uniswapv4'

import { Token } from '@uniswap/sdk-core'
import { Pool, Position as V4Position } from '@uniswap/v4-sdk'
import { erc20Abi } from 'viem'
import { base } from 'viem/chains'

type PositionLiquidityResult = {
  status: 'success' | 'error'
  result: bigint
}

type PoolAndPositionInfoResult = {
  status: 'success' | 'error'
  result: [
    poolKey: {
      currency0: Address
      currency1: Address
      fee: number
      tickSpacing: number
      hooks: Address
    },
    positionInfo: bigint,
  ]
}

type MulticallPositionsResult = (PositionLiquidityResult | PoolAndPositionInfoResult)[]

export function useUniswapV4Positions(ownerAddress: string) {
  const { readOnlyClient } = useWeb3Status()

  const {
    data: positions,
    isLoading: isLoadingPositions,
    refetch,
  } = useQuery({
    queryKey: ['uniswapV4Positions', ownerAddress],
    queryFn: async () => {
      // fetch Positions from Subgraph
      const sgPositions = await fetchPositions(ownerAddress)

      // if no positions, return []
      if (!readOnlyClient || !sgPositions) return []

      // fetch Position Liquidity and Pool Info using tokenIds from Subgraph
      const positions = (await readOnlyClient.multicall({
        contracts: sgPositions.positions.flatMap((position) => [
          {
            address: V4_POSITION_MANAGER_ADDRESS_BASE as Address,
            abi: positionManagerABI,
            functionName: 'getPositionLiquidity',
            args: [position.tokenId],
          },
          {
            address: V4_POSITION_MANAGER_ADDRESS_BASE as Address,
            abi: positionManagerABI,
            functionName: 'getPoolAndPositionInfo',
            args: [position.tokenId],
          },
        ]),
      })) as MulticallPositionsResult

      // enrich positions with liquidity and pool info
      const enrichedPositions = positions
        .map((_, index) => {
          const liquidityRes = positions?.[index * 2] // 2 results per position
          const infoRes = positions?.[index * 2 + 1]

          if (
            liquidityRes?.status !== 'success' ||
            infoRes?.status !== 'success' ||
            (liquidityRes.result === 0n && liquidityRes)
          )
            return null

          const liquidity = liquidityRes.result as bigint
          const [poolKey, info] = infoRes.result as [any, bigint]

          let poolId: string | null = null
          try {
            poolId = getPoolIdFromPoolKey(poolKey)
          } catch (error) {
            console.error(error)
            poolId = null
          }

          return {
            tokenId: sgPositions.positions[index].tokenId,
            liquidity,
            poolKey,
            rawInfo: info,
            poolInfo: decodePositionInfo(info),
            poolId,
          }
        })
        .filter(Boolean) // filter out null values

      if (!enrichedPositions.length) return []

      const poolTokens = enrichedPositions?.flatMap((position) => [
        position?.poolKey.currency0,
        position?.poolKey.currency1,
      ])

      // fetch token info for pool tokens
      const tokensInfo = await readOnlyClient.multicall({
        contracts: poolTokens?.flatMap((token) => [
          {
            address: token as Address,
            abi: erc20Abi,
            functionName: 'decimals',
            args: [],
          },
          {
            address: token as Address,
            abi: erc20Abi,
            functionName: 'symbol',
            args: [],
          },
        ]),
      })

      const token0 = new Token(
        base.id,
        poolTokens?.[0] as Address,
        tokensInfo?.[0]?.result as number,
        tokensInfo?.[1]?.result as string,
      )

      const token1 = new Token(
        base.id,
        poolTokens?.[1] as Address,
        tokensInfo?.[2]?.result as number,
        tokensInfo?.[3]?.result as string,
      )

      // fetch slot0 data for positions
      const slot0Data = await readOnlyClient.multicall({
        contracts: enrichedPositions?.map((position) => ({
          address: V4_STATE_VIEW_ADDRESS_BASE as Address,
          abi: StateViewABI,
          functionName: 'getSlot0',
          args: [position?.poolId],
        })),
      })

      const positionsWithSlot0 = enrichedPositions?.map((position, index) => {
        const slot0 = slot0Data?.[index]
        if (!slot0?.result || !Array.isArray(slot0.result)) return null
        const result = slot0.result
        return {
          ...position,
          slot0: {
            sqrtPrice: result[0],
            tick: result[1],
            fee: result[2],
            ipFee: result[3],
          },
        }
      })

      const positionsWithSlot0AndAmounts = await Promise.all(
        positionsWithSlot0?.map(async (position) => {
          if (!position?.slot0 || !position?.liquidity || !position?.poolInfo || !token0 || !token1)
            return null

          const liquidity = await readOnlyClient.readContract({
            address: V4_STATE_VIEW_ADDRESS_BASE as Address,
            abi: StateViewABI,
            functionName: 'getLiquidity',
            args: [position?.poolId as `0x${string}`],
          })

          try {
            const pool = new Pool(
              token0,
              token1,
              position.poolKey.fee,
              position.poolKey.tickSpacing,
              position.poolKey.hooks,
              position.slot0.sqrtPrice.toString(),
              liquidity.toString(),
              position.slot0.tick,
            )

            const amounts = new V4Position({
              pool,
              liquidity: position.liquidity.toString(),
              tickLower: position.poolInfo.tickLower,
              tickUpper: position.poolInfo.tickUpper,
            })

            return {
              poolId: position.poolId,
              token0: token0,
              token1: token1,
              amounts: {
                amount0: amounts.amount0.toSignificant(6),
                amount1: amounts.amount1.toSignificant(6),
              },
            }
          } catch (error) {
            console.error(error)
            return null
          }
        }),
      )

      return positionsWithSlot0AndAmounts
    },
  })

  return {
    positions,
    isLoading: isLoadingPositions,
    refetch,
  }
}
