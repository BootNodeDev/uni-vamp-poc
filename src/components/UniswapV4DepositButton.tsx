import { useState } from 'react'
import styled from 'styled-components'

import { useUniswapPosition } from '@/src/hooks/useUniswapV4Deposit'
import { useV4Pool } from '@/src/hooks/useUniswapV4Pool'
import { Button } from '@bootnodedev/db-ui-toolkit'
import type { Token } from '@uniswap/sdk-core'

const ButtonContainer = styled.div`
  margin-top: 0.5rem;
`

const UniswapV4Deposit = ({
  token0,
  token1,
  amount0,
  amount1,
  enabled,
}: {
  token0: Token
  token1: Token
  amount0: bigint
  amount1: bigint
  enabled: boolean
}) => {
  // const { deposit } = useSimpleUniswapV4Deposit()
  const [isTransactionPending, setIsTransactionPending] = useState(false)

  const { data: pool } = useV4Pool({
    tokenA: { token: token0, amount: amount0 },
    tokenB: { token: token1, amount: amount1 },
  })

  const sendTx = useUniswapPosition(
    pool,
    { token: token0, amount: amount0 },
    { token: token1, amount: amount1 },
  )

  console.log('pool', pool)

  const handleDeposit = async () => {
    setIsTransactionPending(true)
    try {
      const txHash = await sendTx()
      return txHash
    } finally {
      setIsTransactionPending(false)
    }
  }

  return (
    <ButtonContainer>
      <Button
        onClick={handleDeposit}
        disabled={isTransactionPending || !enabled}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: '#1F2937',
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
      >
        Deposit to Uniswap V4 Pool
      </Button>
    </ButtonContainer>
  )
}

export default UniswapV4Deposit
