// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract DappToken {
    uint public totalSupply;

    constructor() {
        totalSupply = 1000000;
    }
}