const DappToken = artifacts.require('./DappToken.sol');

contract('DappToken', function (accounts) {
  it('sets the total supply upon deployment', async () => {
    const tokenInstance = await DappToken.deployed();
    const totalSupply = await tokenInstance.totalSupply();
    assert.equal(
      totalSupply.toNumber(),
      1000000,
      'sets the total supply to 1,000,000'
    );
  });
});
