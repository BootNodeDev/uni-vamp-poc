import { useState } from 'react'
import styled from 'styled-components'

import TransactionButton from '@/src/components/sharedComponents/TransactionButton'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  background-color: var(--theme-token-input-background, #fff);
  border-radius: 0.75rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 10%), 0 2px 4px -1px rgb(0 0 0 / 6%);
`

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: #111827;
`

const Description = styled.p`
  color: #4b5563;
  font-size: 0.875rem;
  margin: 0.5rem 0;
`

const InfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.875rem;
  
  &:last-child {
    border-bottom: none;
  }
`

const InfoLabel = styled.span`
  color: #6b7280;
`

const InfoValue = styled.span`
  color: #111827;
  font-weight: 500;
`

const Note = styled.div`
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #f3f4f6;
  border-radius: 0.5rem;
  border-left: 4px solid #6366f1;
  font-size: 0.875rem;
  color: #4b5563;
`

const ButtonContainer = styled.div`
  margin-top: 0.5rem;
`

const UniswapV4Deposit = () => {
  // const { deposit } = useSimpleUniswapV4Deposit()
  const [isTransactionPending, setIsTransactionPending] = useState(false)

  // Mock tokens (would come from a state/props in a real implementation)
  const token0 = {
    address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' as `0x${string}`,
    decimals: 6,
    symbol: 'USDC',
    amount: 1000000n, // 1 USDC
  }

  const token1 = {
    address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2' as `0x${string}`,
    decimals: 6,
    symbol: 'USDT',
    amount: 1000000n, // 1 USDT
  }

  // Pool ID (salt) for the Uniswap V4 pool
  const poolId = '0x841c1a22d9a505cbba3e9bf90fd43e1201a09932ca0a90816579346be5f092af'

  const handleDeposit = async () => {
    setIsTransactionPending(true)
    try {
      // const txHash = await deposit(token0, token1, poolId)
      return '0x' as `0x${string}`
    } finally {
      setIsTransactionPending(false)
    }
  }

  return (
    <Container>
      <Title>Deposit to Uniswap V4 Pool</Title>
      <Description>Add liquidity to the Uniswap V4 USDC/USDT pool with a single click.</Description>

      <div>
        <InfoItem>
          <InfoLabel>Asset Pair:</InfoLabel>
          <InfoValue>
            {token0.symbol}/{token1.symbol}
          </InfoValue>
        </InfoItem>
        <InfoItem>
          <InfoLabel>Amount to Deposit:</InfoLabel>
          <InfoValue>
            {Number(token0.amount) / 10 ** token0.decimals} {token0.symbol} +{' '}
            {Number(token1.amount) / 10 ** token1.decimals} {token1.symbol}
          </InfoValue>
        </InfoItem>
        <InfoItem>
          <InfoLabel>Pool ID:</InfoLabel>
          <InfoValue>{`${poolId.substring(0, 10)}...${poolId.substring(poolId.length - 8)}`}</InfoValue>
        </InfoItem>
      </div>

      <Note>
        <strong>Note:</strong> This is a simplified implementation for demonstration purposes. In
        Uniswap V4, pools are identified by a unique pool ID (salt) rather than traditional contract
        addresses like in V3.
      </Note>

      <ButtonContainer>
        <TransactionButton
          transaction={handleDeposit}
          disabled={isTransactionPending}
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
        </TransactionButton>
      </ButtonContainer>
    </Container>
  )
}

export default UniswapV4Deposit
