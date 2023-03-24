# smartcontracts

A package which contains the Ethereum smart contracts for the DeFiChain to Ethereum bridge.

## Deployed Smart Contracts on development testnet (http://127.0.0.1:8545/)

Before running the below script, devs need to run a local hardhat node. This can be achieved by running `nx hardhat node` in the package/smartcontracts/src directory.

If local node is running on different port other than `8545`. Devs need to update the port in `./src/hardhat.config.ts` under development network.

Then, to deploy the Smart Contracts and mint test tokens on local testnet, devs can run the command `npx hardhat run --network development ./scripts/localContractsDeployment.ts` in the package/smartcontracts/src directory.

This script will deploy all needed contracts. Will mint `100,000` MUSDC and MUSDT token to the user(in this case, accounts[0]). This will also approve the Bridge contract and add test tokens as supported tokens for bridging with maximum daily allowance.

Following addresses will be the admin, operational roles and relayer address.

Admin == accounts[0],

Operational == accounts[1],

Relayer address == accounts[0]

Devs can change these addresses as per their requirements in `../scripts/localContractsDeployment.ts` file.
