import type { Address } from 'viem'

export type PoolKey = {
  currency0: Address
  currency1: Address
  fee: number
  tickSpacing: number
  hooks: Address
}

export type DecodedPositionInfo = {
  hasSubscriber: number
  tickLower: number
  tickUpper: number
  poolId: bigint
}

export type PositionSubgraph = {
  id: string
  tokenId: string
}
