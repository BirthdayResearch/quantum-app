// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract ShellBridgeV1 {

    /**
     * @notice Emitted when the user bridges token to DefiChain
     * @param defiAddress defiAddress DeFiChain address of user
     * @param tokenAddress Supported token's being bridged
     * @param amount Amount of the token being bridged
     * @param timestamp TimeStamp of the transaction
     */
    event BRIDGE_TO_DEFI_CHAIN(
        bytes indexed defiAddress,
        address indexed tokenAddress,
        uint256 indexed amount,
        uint256 timestamp
    );


    constructor() {
    }

    /**
     * @notice Used to transfer the supported token from Mainnet(EVM) to DefiChain
     * Transfer will only be possible if not in change allowance peroid.
     * @param _defiAddress DefiChain token address
     * @param _tokenAddress Supported token address that being bridged
     * @param _amount Amount to be bridged, this in in Wei
     */
    function bridgeToDeFiChain(
        bytes calldata _defiAddress,
        address _tokenAddress,
        uint256 _amount
    ) external payable {
        emit BRIDGE_TO_DEFI_CHAIN(_defiAddress, _tokenAddress, 100000000000, block.timestamp);
    }

}
