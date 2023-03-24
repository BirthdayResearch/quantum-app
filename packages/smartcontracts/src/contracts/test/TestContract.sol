pragma solidity ^0.8.13;

contract TestContract {
    string public arbitraryString;

    function setString(string memory _arbitraryString) public {
        arbitraryString = _arbitraryString;
    }
}
