pragma solidity 0.8.18;
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract TestToken is ERC20 {
    constructor(string memory a, string memory b) ERC20(a, b) {}

    function mint(address _to, uint256 _amount) external {
        _mint(_to, _amount);
    }
}
