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

export function useUniswapV4Positions(ownerAddress: string) {
  const { readOnlyClient, appChainId } = useWeb3Status()

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

      const myPositions = await Promise.allSettled(
        sgPositions.positions.map(async (position) => {
          const multicallResult = await readOnlyClient.multicall({
            contracts: [
              {
                address: V4_POSITION_MANAGER_ADDRESS_BASE as Address,
                abi: positionManagerABI,
                functionName: 'getPoolAndPositionInfo',
                args: [BigInt(position.tokenId)],
              },
              {
                address: V4_POSITION_MANAGER_ADDRESS_BASE as Address,
                abi: positionManagerABI,
                functionName: 'getPositionLiquidity',
                args: [BigInt(position.tokenId)],
              },
            ],
          })

          const [poolAndPositionInfoResult, positionLiquidityResult] = multicallResult

          if (
            poolAndPositionInfoResult.status !== 'success' ||
            positionLiquidityResult.status !== 'success' ||
            positionLiquidityResult.result === BigInt(0) // if liquidity is 0, the position is closed
          ) {
            return null
          }

          const [poolInfo, infoBytes] = poolAndPositionInfoResult.result
          const positionLiquidity = positionLiquidityResult.result

          const poolId = getPoolIdFromPoolKey(poolInfo)

          const positionInfo = decodePositionInfo(infoBytes)

          const poolTokens = [poolInfo.currency0, poolInfo.currency1]

          const tokensInfo = await readOnlyClient.multicall({
            contracts: poolTokens.flatMap((token) => [
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

          const poolLiquidity = await readOnlyClient.readContract({
            address: V4_STATE_VIEW_ADDRESS_BASE as Address,
            abi: StateViewABI,
            functionName: 'getLiquidity',
            args: [poolId],
          })

          const token0 = new Token(
            appChainId,
            poolTokens?.[0] as Address,
            tokensInfo?.[0]?.result as number,
            tokensInfo?.[1]?.result as string,
          )

          const token1 = new Token(
            appChainId,
            poolTokens?.[1] as Address,
            tokensInfo?.[2]?.result as number,
            tokensInfo?.[3]?.result as string,
          )

          // return [sqrtPriceX96, tick, protocolFee, lpFee]
          const slot0Data = await readOnlyClient.readContract({
            address: V4_STATE_VIEW_ADDRESS_BASE as Address,
            abi: StateViewABI,
            functionName: 'getSlot0',
            args: [poolId],
          })

          const [sqrtPriceX96, tick] = slot0Data

          try {
            const pool = new Pool(
              token0,
              token1,
              poolInfo.fee,
              poolInfo.tickSpacing,
              poolInfo.hooks,
              sqrtPriceX96.toString(),
              poolLiquidity.toString(),
              tick,
            )

            const amounts = new V4Position({
              pool,
              liquidity: positionLiquidity.toString(),
              tickLower: positionInfo.tickLower,
              tickUpper: positionInfo.tickUpper,
            })

            return {
              poolId: poolId,
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

      return myPositions
        .filter((position) => position?.status === 'fulfilled')
        .map((position) => position.value)
        .filter((position) => position !== null)
    },
  })

  return {
    positions,
    isLoading: isLoadingPositions,
    refetch,
  }
}
