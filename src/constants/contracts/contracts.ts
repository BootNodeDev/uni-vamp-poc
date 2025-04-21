import {
  type Abi,
  type Address,
  type ContractFunctionArgs as WagmiContractFunctionArgs,
  type ContractFunctionName as WagmiContractFunctionName,
  erc20Abi,
  isAddress,
} from 'viem'

import type { ChainsIds } from '@/src/lib/networks.config'

type OptionalAddresses = Partial<Record<ChainsIds, Address>>
type ContractConfig<TAbi> = {
  abi: TAbi
  name: string
  address?: OptionalAddresses
}

/**
 * A collection of contracts to be used in the dapp with their ABI and addresses per chain.
 *
 * @dev The data required to configure this variable is:
 *  - `RequiredChainId` is mandatory in the address object.
 *  - IDs defined `ChainIds` can be added as well if necessary.
 */
const contracts = [
  {
    abi: erc20Abi,
    name: 'ERC20',
  },
] as const satisfies ContractConfig<Abi>[]

/**
 * Retrieves all contracts.
 *
 * @returns {Array<ContractConfig>} An array containing the contracts' ABI and addresses.
 */
export const getContracts = () => contracts

export type ContractNames = (typeof contracts)[number]['name']

type ContractOfName<CN extends ContractNames> = Extract<(typeof contracts)[number], { name: CN }>
type AbiOfName<CN extends ContractNames> = ContractOfName<CN>['abi']

type AddressRecord<T extends ContractNames> = ContractOfName<T> extends { address: infer K }
  ? K
  : never
type ChainIdOf<T extends ContractNames> = keyof AddressRecord<T>

export type ContractFunctionName<CN extends ContractNames> = WagmiContractFunctionName<
  AbiOfName<CN>,
  'nonpayable' | 'payable'
>

export type ContractFunctionArgs<
  CN extends ContractNames,
  MN extends ContractFunctionName<CN>,
> = WagmiContractFunctionArgs<AbiOfName<CN>, 'nonpayable' | 'payable', MN>

/**
 * Retrieves the contract information based on the contract name and chain ID.
 *
 * @param {string} name - The name of the contract.
 * @param {ChainsIds} chainId - The chain ID configured in the dApp. See networks.config.ts.
 * @returns {Contract} An object containing the contract's ABI and address.
 *
 * @throws If contract is not found.
 */
export const getContract = <
  ContractName extends ContractNames,
  ChainId extends ChainIdOf<ContractName>,
>(
  name: ContractName,
  chainId: ChainId,
) => {
  const contract = contracts.find((contract) => contract.name === name)

  if (!contract) {
    throw new Error(`Contract ${name} not found`)
  }

  // address key not present
  if (!('address' in contract)) {
    throw new Error(`Contract ${name} address not found}`)
  }

  const address = (contract.address as AddressRecord<ContractName>)[chainId]

  // address undefined
  if (!address) {
    throw new Error(`Contract ${name} address not found for chain ${chainId.toString()}`)
  }

  // not a valid address
  if (!isAddress(address as string)) {
    throw new Error(`Contract ${name} address is not a valid address`)
  }

  return { abi: contract.abi as AbiOfName<ContractName>, address }
}
