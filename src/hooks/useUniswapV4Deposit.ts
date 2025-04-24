import { usePermit2BatchSignature } from '@/src/hooks/usePermit2BatchSignature'
import { V4_POSITION_MANAGER_ADDRESS_BASE } from '@/src/hooks/useUniswapV4Pool'
import { useWeb3Status } from '@/src/hooks/useWeb3Status'
import { Percent, type Token } from '@uniswap/sdk-core'
import { TickMath, nearestUsableTick } from '@uniswap/v3-sdk'
import { type Pool, Position, V4PositionManager } from '@uniswap/v4-sdk'
import { sendTransaction } from 'viem/actions'
import { useBlock } from 'wagmi'

export function useUniswapPosition(
  pool: Pool | undefined,
  tokenA: { token: Token; amount: bigint },
  tokenB: { token: Token; amount: bigint },
) {
  const { address: user, walletClient, readOnlyClient } = useWeb3Status()
  const { data: block } = useBlock()
  const deadline = block?.timestamp ? block.timestamp + 60n * 15n : undefined // 15 minutes

  const { data: permit2BatchSignature, sign } = usePermit2BatchSignature({
    tokens: [tokenA.token.address as `0x${string}`, tokenB.token.address as `0x${string}`],
    spender: V4_POSITION_MANAGER_ADDRESS_BASE,
  })

  if (!pool || !user || !walletClient || !readOnlyClient || !deadline) return () => null

  const [amount0, amount1] =
    tokenA.token.address.toLowerCase() < tokenB.token.address.toLowerCase()
      ? [tokenA.amount, tokenB.amount]
      : [tokenB.amount, tokenA.amount]

  const tickLower = nearestUsableTick(TickMath.MIN_TICK, pool.tickSpacing)
  const tickUpper = nearestUsableTick(TickMath.MAX_TICK, pool.tickSpacing)

  const position = Position.fromAmounts({
    pool,
    tickLower,
    tickUpper,
    amount0: amount0.toString(),
    amount1: amount1.toString(),
    useFullPrecision: true,
  })

  console.log('position', position)
  console.log('blockTimestamp', block?.timestamp)
  console.log('deadline', deadline.toString())

  const sendTx = async () => {
    if (!permit2BatchSignature) return

    const permitSignature = await sign()

    if (!permitSignature) {
      console.error('Error signing permit2 batch signature')
      return
    }

    const { calldata, value } = V4PositionManager.addCallParameters(position, {
      recipient: user,
      deadline: deadline.toString(),
      slippageTolerance: new Percent(50, 10_000),
      createPool: position.pool.liquidity.toString() === '0',
      sqrtPriceX96: pool.sqrtRatioX96,
      batchPermit: {
        owner: permit2BatchSignature.owner,
        permitBatch: permit2BatchSignature.permitBatch,
        signature: permitSignature,
      },
    })

    return await sendTransaction(walletClient, {
      account: user,
      to: V4_POSITION_MANAGER_ADDRESS_BASE,
      data: calldata as `0x${string}`,
      value: BigInt(value),
    })
  }

  return sendTx
}
