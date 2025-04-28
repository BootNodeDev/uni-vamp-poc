import {
  BalancerApi,
  type InputAmount,
  PermitHelper,
  RemoveLiquidity,
  RemoveLiquidityKind,
  Slippage,
} from '@balancer/sdk'
// src/hooks/useRemoveLiquidityProportional.ts
import { useCallback } from 'react'
import { type TransactionReceipt, publicActions } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'

/**
 * Hook: useExitBalancerPool
 * -----------------------------------
 * Provides methods to exit Balancer V3 pools.
 * Supports single, batch, and PoolShare-based removals.
 */
export function useExitBalancerPool() {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  /**
   * removeOne
   * ---------
   * Execute a single proportional remove-liquidity transaction for a given BPT input.
   * @param bptIn - BPT token amount and pool address.
   * @returns Promise<string> resolves to transaction hash.
   */
  const removeOne = useCallback(
    async (bptIn: InputAmount): Promise<TransactionReceipt> => {
      if (!walletClient || !publicClient) {
        throw new Error('Wallet or public client not initialized')
      }

      // 1. Fetch chainId and extend wallet client with read actions
      const chainId = await publicClient.getChainId()
      const client = walletClient.extend(publicActions)

      // 2. Define remove-liquidity parameters
      const kind = RemoveLiquidityKind.Proportional as const
      const slippage = Slippage.fromPercentage('10')

      // 3. Fetch on-chain pool state
      const api = new BalancerApi('https://api-v3.balancer.fi/', chainId)
      const poolState = await api.pools.fetchPoolState(bptIn.address)

      // 4. Prepare RemoveLiquidity helper
      const removeLiquidity = new RemoveLiquidity()
      const rpcUrl = (publicClient.transport as any).url as string
      const block = await publicClient.getBlock()

      // 5. Query to compute amountsOut and auxiliary data
      const input = { chainId, rpcUrl, kind, bptIn }
      const queryOutput = await removeLiquidity.query(input, poolState, block.number)

      // 6. Sign permit (EIP‑2612) if needed
      const permit = await PermitHelper.signRemoveLiquidityApproval({
        ...queryOutput,
        slippage,
        client,
        owner: walletClient.account,
        deadline: block.timestamp + 300n,
      })

      // 7. Applies slippage to the BPT out amount and constructs the call
      const call = removeLiquidity.buildCallWithPermit({ ...queryOutput, slippage } as any, permit)

      console.log('Balancer query output:', queryOutput)
      console.log('Balancer BPT in:', bptIn)

      // 8. Send on-chain transaction
      const txHash = await walletClient.sendTransaction({
        account: walletClient.account,
        data: call.callData,
        to: call.to,
        value: call.value,
      })

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 2,
      })

      return receipt
    },
    [walletClient, publicClient],
  )

  return { removeOne }
}
