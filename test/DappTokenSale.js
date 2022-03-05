var DappToken = artifacts.require('./DappToken.sol');
var DappTokenSale = artifacts.require('./DappTokenSale.sol');

contract('DappTokenSale', function (accounts) {
  let tokenInstance;
  let tokenSaleInstance;
  let admin = accounts[0];
  let buyer = accounts[1];
  let tokenPrice = 1000000000000000; // in wei
  let tokensAvailable = 750000;
  let numberOfTokens;

  it('initializes the contract with the correct values', async () => {
    tokenSaleInstance = await DappTokenSale.deployed();

    const address1 = await tokenSaleInstance.address;
    assert.notEqual(address1, 0x0, 'has contract address');

    const address2 = tokenSaleInstance.tokenContract();
    assert.notEqual(address2, 0x0, 'has token contract address');

    const price = await tokenSaleInstance.tokenPrice();
    assert.equal(price, tokenPrice, 'token price is correct');
  });

  it('facilitates token buying', async () => {
    tokenInstance = await DappToken.deployed();
    tokenSaleInstance = await DappTokenSale.deployed();

    // Provision 75% of all tokens to the token sale
    await tokenInstance.transfer(tokenSaleInstance.address, tokensAvailable, {
      from: admin,
    });

    numberOfTokens = 10;
    const receipt = await tokenSaleInstance.buyTokens(numberOfTokens, {
      from: buyer,
      value: numberOfTokens * tokenPrice,
    });
    assert.equal(receipt.logs.length, 1, 'triggers one event');
    assert.equal(receipt.logs[0].event, 'Sell', 'should be the "Sell" event');
    assert.equal(
      receipt.logs[0].args._buyer,
      buyer,
      'logs the account that purchased the tokens'
    );
    assert.equal(
      receipt.logs[0].args._amount,
      numberOfTokens,
      'logs the number of tokens purchased'
    );

    const amount = await tokenSaleInstance.tokensSold();
    assert.equal(
      amount.toNumber(),
      numberOfTokens,
      'increments the number of tokens sold'
    );

    const balanceBuyer = await tokenInstance.balanceOf(buyer);
    assert.equal(balanceBuyer.toNumber(), numberOfTokens);

    const balance = await tokenInstance.balanceOf(tokenSaleInstance.address);
    assert.equal(balance.toNumber(), tokensAvailable - numberOfTokens);

    // Try to buy tokens different from the ether value
    try {
      await tokenSaleInstance.buyTokens(numberOfTokens, {
        from: buyer,
        value: 1,
      });
    } catch (error) {
      assert(
        error.message.indexOf('revert') >= 0,
        'msg.value must equal number of tokens in wei'
      );
    }

    try {
      await tokenSaleInstance.buyTokens(800000, {
        from: buyer,
        value: numberOfTokens * tokenPrice,
      });
    } catch (error) {
      assert(
        error.message.indexOf('revert') >= 0,
        'cannot purchase more tokens than available'
      );
    }
  });

  it('ends token sale', async () => {
    tokenInstance = await DappToken.deployed();
    tokenSaleInstance = await DappTokenSale.deployed();

    // Try to end sale from account other than the admin
    try {
      await tokenSaleInstance.endSale({ from: buyer });
    } catch (error) {
      assert(error.message.indexOf('revert' >= 0, 'must be admin to end sale'));
    }

    // End sale as admin
    await tokenSaleInstance.endSale({ from: admin });

    const balanceAdmin = await tokenInstance.balanceOf(admin);

    assert.equal(
      balanceAdmin.toNumber(),
      999990,
      'returns all unsold dapp tokens to admin'
    );

    const balance = await web3.eth.getBalance(tokenSaleInstance.address);
    assert.equal(balance, 0);
  });
});
