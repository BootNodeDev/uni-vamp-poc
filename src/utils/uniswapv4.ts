import type { DecodedPositionInfo } from '@/src/types/uniswap'
import type { PoolKey } from '@uniswap/v4-sdk'
import { type Address, encodeAbiParameters, keccak256 } from 'viem'

export function decodePositionInfo(info: bigint): DecodedPositionInfo {
  const decodeInt24 = (value: bigint) => {
    const raw = value & 0xffffffn
    return raw >= 0x800000n ? Number(raw - 0x1000000n) : Number(raw)
  }

  return {
    hasSubscriber: Number(info & 0xffn),
    tickLower: decodeInt24(info >> 8n),
    tickUpper: decodeInt24(info >> 32n),
    poolId: info >> 56n,
  }
}

export function getPoolIdFromPoolKey(poolKey: PoolKey): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'address', name: 'currency0' },
        { type: 'address', name: 'currency1' },
        { type: 'uint24', name: 'fee' },
        { type: 'int24', name: 'tickSpacing' },
        { type: 'address', name: 'hooks' },
      ],
      [
        poolKey.currency0 as Address,
        poolKey.currency1 as Address,
        poolKey.fee,
        poolKey.tickSpacing,
        poolKey.hooks as Address,
      ],
    ),
  )
}
