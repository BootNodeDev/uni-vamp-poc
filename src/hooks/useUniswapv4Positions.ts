import {
  StateViewABI,
  V4_POSITION_MANAGER_ADDRESS_BASE,
  V4_STATE_VIEW_ADDRESS_BASE,
  positionManagerABI,
} from '@/src/hooks/useUniswapV4Pool'
import { useQuery } from '@tanstack/react-query'
import request, { gql } from 'graphql-request'
import type { Address } from 'viem'
import { useReadContracts } from 'wagmi'
const endpoint =
  'https://gateway.thegraph.com/api/subgraphs/id/HNCFA9TyBqpo5qpe6QreQABAA1kV8g46mhkCcicu6v2R'

import { Token } from '@uniswap/sdk-core'
import { Pool, Position as V4Position } from '@uniswap/v4-sdk'
import { encodeAbiParameters, erc20Abi, keccak256 } from 'viem'
import { base } from 'viem/chains'

const query = gql`
  query GetPositions($owner: String!) {
    positions(where: { owner: $owner }) {
      id
      tokenId
    }
  }
`

type Position = {
  id: string
  tokenId: string
}

const headers = {
  Authorization: 'Bearer 5d0a3d479ac1892fb6ab7b4ad977bcf9',
}

export function getPoolIdFromPoolKey(poolKey: {
  currency0: Address
  currency1: Address
  fee: number
  tickSpacing: number
  hooks: Address
}): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'address', name: 'currency0' },
        { type: 'address', name: 'currency1' },
        { type: 'uint24', name: 'fee' },
        { type: 'int24', name: 'tickSpacing' },
        { type: 'address', name: 'hooks' },
      ],
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
    ),
  )
}

function decodeInt24FromInfo(info: bigint, shift: number): number {
  const raw = (info >> BigInt(shift)) & 0xffffffn
  return raw >= 0x800000n ? Number(raw - 0x1000000n) : Number(raw)
}

export function decodePositionInfo(info: bigint) {
  return {
    hasSubscriber: Number(info & 0xffn),
    tickUpper: decodeInt24FromInfo(info, 32), // ✅ bits 32–55
    tickLower: decodeInt24FromInfo(info, 8), // ✅ bits 8–31
    poolId: info >> 56n, // ✅ bits 56–255 (25 bytes)
  }
}

async function fetchPositions(ownerAddress: string) {
  const data = await request<{ positions: Position[] }>(
    endpoint,
    query,
    { owner: ownerAddress.toLowerCase() },
    headers,
  )
  return data
}

export function useUniswapV4Positions(ownerAddress: string) {
  const {
    data,
    error,
    isLoading: isLoadingPositions,
  } = useQuery({
    queryFn: () => fetchPositions(ownerAddress),
    queryKey: ['uniswapV4Positions', ownerAddress],
  })

  const { data: rawData, isLoading: isLoadingRawData } = useReadContracts({
    multicallAddress: '0xca11bde05977b3631167028862be2a173976ca11',
    contracts:
      data?.positions.flatMap((position) => [
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
      ]) ?? [],
    query: {
      enabled: !!data?.positions.length,
    },
  }) as {
    isLoading: boolean
    data: {
      status: 'success' | 'error'
      result: any
    }[]
  }

  const enrichedPositions = data?.positions
    .map((position, index) => {
      const liquidityRes = rawData?.[index * 2]
      const infoRes = rawData?.[index * 2 + 1]

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
      // acá podés hacer decodePositionInfo(info) si querés
      return {
        tokenId: position.tokenId,
        liquidity,
        poolKey,
        rawInfo: info,
        poolInfo: decodePositionInfo(info),
        poolId,
      }
    })
    .filter(Boolean)

  const poolTokens = enrichedPositions?.flatMap((position) => [
    position?.poolKey.currency0,
    position?.poolKey.currency1,
  ])

  const { data: tokensInfo, isLoading: isLoadingTokensInfo } = useReadContracts({
    multicallAddress: '0xca11bde05977b3631167028862be2a173976ca11',
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
    query: {
      enabled: !!poolTokens?.length,
    },
  })

  let token0: Token | null = null
  let token1: Token | null = null
  try {
    token0 = new Token(
      base.id,
      poolTokens?.[0] as Address,
      tokensInfo?.[0]?.result as number,
      tokensInfo?.[1]?.result as string,
    )

    token1 = new Token(
      base.id,
      poolTokens?.[1] as Address,
      tokensInfo?.[2]?.result as number,
      tokensInfo?.[3]?.result as string,
    )
  } catch (error) {
    console.error(error)
  }

  const { data: slot0Data, isLoading: isLoadingSlot0Data } = useReadContracts({
    multicallAddress: '0xca11bde05977b3631167028862be2a173976ca11',
    contracts: enrichedPositions?.map((position) => ({
      address: V4_STATE_VIEW_ADDRESS_BASE as Address,
      abi: StateViewABI,
      functionName: 'getSlot0',
      args: [position?.poolId],
    })),
    query: {
      enabled: !!enrichedPositions?.length,
    },
  })

  type Slot0Result = readonly [bigint, number, number, number]

  const positionsWithSlot0 = enrichedPositions?.map((position, index) => {
    const slot0 = slot0Data?.[index]
    if (!slot0?.result || !Array.isArray(slot0.result)) return null
    const result = slot0.result as Slot0Result
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

  const positionsWithSlot0AndAmounts = positionsWithSlot0?.map((position) => {
    if (!position?.slot0 || !position?.liquidity || !position?.poolInfo || !token0 || !token1)
      return null

    try {
      const pool = new Pool(
        token0,
        token1,
        position.poolKey.fee,
        position.poolKey.tickSpacing,
        position.poolKey.hooks,
        position.slot0.sqrtPrice.toString(),
        '1',
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
  })

  return {
    positions: positionsWithSlot0AndAmounts,
    error,
    isLoading: isLoadingRawData || isLoadingTokensInfo || isLoadingSlot0Data || isLoadingPositions,
  }
}
