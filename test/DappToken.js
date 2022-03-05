const DappToken = artifacts.require('./DappToken.sol');

contract('DappToken', (accounts) => {
  let tokenInstance;

  it('initializes the contract with the correct value', async () => {
    tokenInstance = await DappToken.deployed();
    const name = await tokenInstance.name();
    const symbol = await tokenInstance.symbol();
    const standard = await tokenInstance.standard();

    assert.equal(name, 'Dapp Token', 'has the correct name');
    assert.equal(symbol, 'DAPP', 'has the correct symbol');
    assert.equal(standard, 'Dapp Token v1.0', 'has the correct standard');
  });

  it('allocates the initial supply upon deployment', async () => {
    // arrange
    tokenInstance = await DappToken.deployed();

    // act
    const totalSupply = await tokenInstance.totalSupply();
    const adminBalance = await tokenInstance.balanceOf(accounts[0]);
    // assert
    assert.equal(
      totalSupply.toNumber(),
      1000000,
      'sets the total supply to 1,000,000'
    );

    assert.equal(
      adminBalance.toNumber(),
      1000000,
      'it allocates the initial supply to the admin account'
    );
  });

  it('transfers token ownership', async () => {
    tokenInstance = await DappToken.deployed();

    try {
      await tokenInstance.transfer.call(accounts[1], 99999999999999999999999);
    } catch (error) {
      assert(
        error.message.indexOf(
          'revert' >= 0,
          'error message must contain revert'
        )
      );

      const success = await tokenInstance.transfer.call(accounts[1], 250000, {
        from: accounts[0],
      });
      assert(success, true, 'it returns value');
    }

    const receipt = await tokenInstance.transfer(accounts[1], 25000, {
      from: accounts[0],
    });
    const balance = await tokenInstance.balanceOf(accounts[1]);
    assert.equal(receipt.logs.length, 1, 'triggers one event');
    assert.equal(
      receipt.logs[0].event,
      'Transfer',
      'should be the "Transfer" event'
    );
    assert.equal(
      receipt.logs[0].args._from,
      accounts[0],
      'logs the account the tokens are transferred from'
    );
    assert.equal(
      receipt.logs[0].args._to,
      accounts[1],
      'logs the account the tokens are transferred to'
    );
    // assert.equal(
    //   receipt.logs[0].args._value,
    //   250000,
    //   'logs the transfer amount'
    // );
    assert(
      balance.toNumber(),
      25000,
      'adds the amount to the receiving account'
    );

    const balance0 = await tokenInstance.balanceOf(accounts[0]);
    assert(
      balance0.toNumber(),
      75000,
      'deducts the amount to the sending account'
    );
  });

  it('approves tokens for delegated transfer', async () => {
    tokenInstance = await DappToken.deployed();

    const success = await tokenInstance.approve.call(accounts[1], 100);
    assert.equal(success, true, 'it returns true');

    const receipt = await tokenInstance.approve(accounts[1], 100, {
      from: accounts[0],
    });
    assert.equal(receipt.logs.length, 1, 'triggers one event');
    assert.equal(
      receipt.logs[0].event,
      'Approval',
      'should be the "Approval" event'
    );
    assert.equal(
      receipt.logs[0].args._owner,
      accounts[0],
      'logs the account the tokens are authorized by'
    );
    assert.equal(
      receipt.logs[0].args._spender,
      accounts[1],
      'logs the account the tokens are authorized to'
    );
    assert.equal(receipt.logs[0].args._value, 100, 'logs the transfer amount');

    const allowance = await tokenInstance.allowance(accounts[0], accounts[1]);
    assert.equal(
      allowance.toNumber(),
      100,
      'stores the allowance for delegated trasnfer'
    );
  });

  it('handles delegated token transfers', async () => {
    tokenInstance = await DappToken.deployed();

    const fromAccount = accounts[2];
    const toAccount = accounts[3];
    const spendingAccount = accounts[4];

    // Transfer some tokens to fromAccount
    await tokenInstance.transfer(fromAccount, 100, { from: accounts[0] });

    // Approve spendingAccount to spend 10 tokens form fromAccount
    await tokenInstance.approve(spendingAccount, 10, { from: fromAccount });

    // Try transferring something larger than the sender's balance
    try {
      await tokenInstance.transferFrom(fromAccount, toAccount, 9999, {
        from: spendingAccount,
      });
    } catch (error) {
      assert(
        error.message.indexOf('revert') >= 0,
        'cannot transfer value larger than balance'
      );
    }

    // Try transferring something larger than the approved amount
    try {
      await tokenInstance.transferFrom(fromAccount, toAccount, 20, {
        from: spendingAccount,
      });
    } catch (error) {
      assert(
        error.message.indexOf('revert') >= 0,
        'cannot transfer value larger than approved amount'
      );
    }

    const success = await tokenInstance.transferFrom.call(
      fromAccount,
      toAccount,
      10,
      { from: spendingAccount }
    );

    assert.equal(success, true);
    const receipt = await tokenInstance.transferFrom(
      fromAccount,
      toAccount,
      10,
      { from: spendingAccount }
    );

    assert.equal(receipt.logs.length, 1, 'triggers one event');
    assert.equal(
      receipt.logs[0].event,
      'Transfer',
      'should be the "Transfer" event'
    );
    assert.equal(
      receipt.logs[0].args._from,
      fromAccount,
      'logs the account the tokens are transferred from'
    );
    assert.equal(
      receipt.logs[0].args._to,
      toAccount,
      'logs the account the tokens are transferred to'
    );
    assert.equal(receipt.logs[0].args._value, 10, 'logs the transfer amount');
    const balanceFromAccount = await tokenInstance.balanceOf(fromAccount);

    assert.equal(
      balanceFromAccount.toNumber(),
      90,
      'deducts the amount from the sending account'
    );
    const balanceToAccount = await tokenInstance.balanceOf(toAccount);

    assert.equal(
      balanceToAccount.toNumber(),
      10,
      'adds the amount from the receiving account'
    );
    const allowance = await tokenInstance.allowance(
      fromAccount,
      spendingAccount
    );

    assert.equal(
      allowance.toNumber(),
      0,
      'deducts the amount from the allowance'
    );
  });
});
