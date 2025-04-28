import { env } from '@/src/env'
import { gql, request } from 'graphql-request'
import { type Address, encodeAbiParameters, keccak256 } from 'viem'

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
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'getPositionLiquidity',
    outputs: [{ internalType: 'uint128', name: 'liquidity', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'getPoolAndPositionInfo',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'currency0', type: 'address' },
          { internalType: 'address', name: 'currency1', type: 'address' },
          { internalType: 'uint24', name: 'fee', type: 'uint24' },
          { internalType: 'int24', name: 'tickSpacing', type: 'int24' },
          { internalType: 'address', name: 'hooks', type: 'address' },
        ],
        internalType: 'struct PoolKey',
        name: 'poolKey',
        type: 'tuple',
      },
      {
        internalType: 'uint256',
        name: 'info',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// getSlot0 ABI
export const StateViewABI = [
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

export const endpoint =
  'https://gateway.thegraph.com/api/subgraphs/id/HNCFA9TyBqpo5qpe6QreQABAA1kV8g46mhkCcicu6v2R'

export const query = gql`
  query GetPositions($owner: String!) {
    positions(where: { owner: $owner }) {
      id
      tokenId
    }
  }
`

export type Position = {
  id: string
  tokenId: string
}

export const headers = {
  Authorization: `Bearer ${env.PUBLIC_SUBGRAPHS_API_KEY}`,
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

export function decodeInt24FromInfo(info: bigint, shift: number): number {
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

export async function fetchPositions(ownerAddress: string) {
  const data = await request<{ positions: Position[] }>(
    endpoint,
    query,
    { owner: ownerAddress.toLowerCase() },
    headers,
  )
  return data
}
