const {
  expectRevert,
  expectEvent,
  BN,
  constants,
} = require('@openzeppelin/test-helpers');

const {expect} = require('chai');

const DigitalaxAccessControls = artifacts.require('DigitalaxAccessControls');
const DigitalaxMaterials = artifacts.require('DigitalaxMaterials');
const DigitalaxMaterialsV2 = artifacts.require('DigitalaxMaterialsV2');
const DigitalaxGarmentNFT = artifacts.require('DigitalaxGarmentNFT');
const DigitalaxGarmentNFTv2TunnelMock = artifacts.require('DigitalaxGarmentNFTv2TunnelMock');
const DigitalaxGarmentFactory = artifacts.require('DigitalaxGarmentFactory');
const DigitalaxRootTunnel = artifacts.require('DigitalaxRootTunnel');
const DigitalaxRootTunnelMock = artifacts.require('DigitalaxRootTunnelMock');

contract('DigitalaxRootTunnel', (accounts) => {
  const [admin, minter, owner, designer] = accounts;

  const bytesResponseL2ToL1 = '0x00000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000180000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002800000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000044000000000000000000000000000000000000000000000000000000000000005c00000000000000000000000000000000000000000000000000000000000000880000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000186a200000000000000000000000000000000000000000000000000000000000186a300000000000000000000000000000000000000000000000000000000000186a40000000000000000000000000000000000000000000000000000000000000003000000000000000000000000e5904695748fe4a84b40b3fc79de2277660bd1d3000000000000000000000000e5904695748fe4a84b40b3fc79de2277660bd1d3000000000000000000000000e5904695748fe4a84b40b3fc79de2277660bd1d3000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000030390000000000000000000000000000000000000000000000000000000000003039000000000000000000000000000000000000000000000000000000000001e240000000000000000000000000000000000000000000000000000000000000000300000000000000000000000092561f28ec438ee9831d00d1d59fbdc981b762b200000000000000000000000092561f28ec438ee9831d00d1d59fbdc981b762b200000000000000000000000092561f28ec438ee9831d00d1d59fbdc981b762b20000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000001172616e646f6d4761726d656e7455726932000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000472616e6400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000572616e64320000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000186a100000000000000000000000000000000000000000000000000000000000186a200000000000000000000000000000000000000000000000000000000000186a300000000000000000000000000000000000000000000000000000000000186a400000000000000000000000000000000000000000000000000000000000186a5000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000002600000000000000000000000000000000000000000000000000000000000000280000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000000000000000000000000000000000000000000f72616e646f6d537472616e645572690000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001072616e646f6d537472616e645572693200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001072616e646f6d537472616e645572693300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001072616e646f6d537472616e645572693400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001072616e646f6d537472616e64557269350000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000000050000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
  const bytesResponseL2ToL1Next = '0x00000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000280000000000000000000000000000000000000000000000000000000000000038000000000000000000000000000000000000000000000000000000000000005c0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000186a10000000000000000000000000000000000000000000000000000000000000001000000000000000000000000e5904695748fe4a84b40b3fc79de2277660bd1d300000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000003039000000000000000000000000000000000000000000000000000000000000000100000000000000000000000092561f28ec438ee9831d00d1d59fbdc981b762b200000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001072616e646f6d4761726d656e745572690000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000186a100000000000000000000000000000000000000000000000000000000000186a200000000000000000000000000000000000000000000000000000000000186a300000000000000000000000000000000000000000000000000000000000186a400000000000000000000000000000000000000000000000000000000000186a500000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000000000000000000000000000000000000000000f72616e646f6d537472616e645572690000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001072616e646f6d537472616e645572693200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001072616e646f6d537472616e645572693300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001072616e646f6d537472616e645572693400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001072616e646f6d537472616e64557269350000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000005000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002';
  const bytesResponseL1toL2 = '0x000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000030390000000000000000000000000000000000000000000000000000000000005ba0000000000000000000000000000000000000000000000000000000000000000200000000000000000000000092561f28ec438ee9831d00d1d59fbdc981b762b200000000000000000000000092561f28ec438ee9831d00d1d59fbdc981b762b2000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000472616e6400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000472616e6400000000000000000000000000000000000000000000000000000000';

  const TOKEN_ONE_ID = new BN('100001');
  const TOKEN_TWO_ID = new BN('100002');
  const TOKEN_THREE_ID = new BN('100003');
  const TOKEN_FOUR_ID = new BN('100004');

  const randomTokenURI = 'rand';
  const randomTokenURI2 = 'rand2';

  const STRAND_ONE_ID = new BN('100001');
  const STRAND_TWO_ID = new BN('100002');
  const STRAND_THREE_ID = new BN('100003');
  const STRAND_FOUR_ID = new BN('100004');
  const STRAND_FIVE_ID = new BN('100005');

  const randomStrandURI = 'randomStrandUri';
  const randomStrandURI2 = 'randomStrandUri2';
  const randomStrandURI3 = 'randomStrandUri3';
  const randomStrandURI4 = 'randomStrandUri4';
  const randomStrandURI5 = 'randomStrandUri5';
  const randomGarmentURI = 'randomGarmentUri';
  const randomGarmentURI2 = 'randomGarmentUri2';


  beforeEach(async () => {
    this.accessControls = await DigitalaxAccessControls.new({from: admin});
    await this.accessControls.addMinterRole(minter, {from: admin});


    this.digitalaxMaterials = await DigitalaxMaterials.new(
        'DigitalaxMaterials',
        'DXM',
        this.accessControls.address,
        '0xb5505a6d998549090530911180f38aC5130101c6',
        constants.ZERO_ADDRESS,
        {from: owner}
    );


    this.digitalaxMaterialsV2 = await DigitalaxMaterialsV2.new(
        'DigitalaxMaterialsV2',
        'DXM',
        this.accessControls.address,
        '0xb5505a6d998549090530911180f38aC5130101c6',
        constants.ZERO_ADDRESS,
        {from: owner}
    );

    this.tokenV2 = await DigitalaxGarmentNFTv2TunnelMock.new();
    await this.tokenV2.initialize(
        this.accessControls.address,
        this.digitalaxMaterialsV2.address,
        '0xb5505a6d998549090530911180f38aC5130101c6',
        constants.ZERO_ADDRESS,
        {from: admin}
    );

    this.token = await DigitalaxGarmentNFT.new(
        this.accessControls.address,
        this.digitalaxMaterials.address,
        '0xb5505a6d998549090530911180f38aC5130101c6',
        constants.ZERO_ADDRESS,
        {from: admin}
    );

    this.garmentFactory = await DigitalaxGarmentFactory.new();
    await this.garmentFactory.initialize(
        this.token.address,
        this.digitalaxMaterials.address,
        this.accessControls.address,
        {from: admin}
    );

    this.garmentFactoryMatic = await DigitalaxGarmentFactory.new();
    await this.garmentFactoryMatic.initialize(
        this.tokenV2.address,
        this.digitalaxMaterialsV2.address,
        this.accessControls.address,
        {from: admin}
    );

    this.digitalaxRootTunnel = await DigitalaxRootTunnel.new(
      this.accessControls.address,
        this.token.address,
        this.digitalaxMaterials.address,
        constants.ZERO_ADDRESS,
    );

    this.digitalaxRootTunnelMock = await DigitalaxRootTunnelMock.new(
      this.accessControls.address,
        this.token.address,
        this.digitalaxMaterials.address,
        constants.ZERO_ADDRESS,
    );


    await this.accessControls.addSmartContractRole(this.garmentFactory.address, {from: admin});
    await this.accessControls.addSmartContractRole(this.garmentFactoryMatic.address, {from: admin});

    await this.accessControls.addSmartContractRole(this.digitalaxRootTunnel.address, {from: admin});
    await this.accessControls.addMinterRole(this.digitalaxRootTunnel.address, {from: admin});
    await this.accessControls.addSmartContractRole(this.digitalaxRootTunnelMock.address, {from: admin});
    await this.accessControls.addMinterRole(this.digitalaxRootTunnelMock.address, {from: admin});

    await this.digitalaxMaterialsV2.setGarmentNFTApproved(this.tokenV2.address, {from: admin});
    // // Create some ERC1155's for use here
    // await this.garmentFactory.createNewChildren(randomChildTokenURIs, {from: minter});

  //  await this.digitalaxMaterialsV2.setApprovalForAll(this.tokenV2.address, true, {from: owner});
  });

  const expectStrandBalanceOfGarmentToBe = async (garmentTokenId, strandId, expectedStrandBalance) => {
    const garmentStrandBalance = await this.token.childBalance(
        garmentTokenId,
        this.digitalaxMaterials.address,
        strandId
    );
    expect(garmentStrandBalance).to.be.bignumber.equal(expectedStrandBalance);
  };

  // L2 to L1
  describe('_processMessageFromChild()', async () => {
    beforeEach(async () => {

      await this.garmentFactoryMatic.createNewChildren([randomStrandURI, randomStrandURI2, randomStrandURI3, randomStrandURI4, randomStrandURI5], {from: minter});

      expect(await this.digitalaxMaterialsV2.uri(STRAND_ONE_ID)).to.be.equal(randomStrandURI);
      expect(await this.digitalaxMaterialsV2.uri(STRAND_TWO_ID)).to.be.equal(randomStrandURI2);
      expect(await this.digitalaxMaterialsV2.uri(STRAND_THREE_ID)).to.be.equal(randomStrandURI3);
      expect(await this.digitalaxMaterialsV2.uri(STRAND_FOUR_ID)).to.be.equal(randomStrandURI4);
      expect(await this.digitalaxMaterialsV2.uri(STRAND_FIVE_ID)).to.be.equal(randomStrandURI5);

      const strand1Amount = '1';
      const strand2Amount = '5';
      const strand3Amount = '2';
      const strand4Amount = '2';
      const strand5Amount = '2';
      const childTokenIds = [STRAND_ONE_ID, STRAND_TWO_ID, STRAND_THREE_ID, STRAND_FOUR_ID, STRAND_FIVE_ID];
      await this.garmentFactoryMatic.mintParentWithChildren(
          randomGarmentURI,
          designer,
          childTokenIds,
          [strand1Amount, strand2Amount, strand3Amount, strand4Amount, strand5Amount], // amounts to mint and link
          owner,
          {from: minter}
      );

      await this.garmentFactoryMatic.mintParentWithChildren(
          randomGarmentURI2,
          designer,
          childTokenIds,
          [strand1Amount, strand2Amount, strand3Amount, strand4Amount, strand5Amount], // amounts to mint and link
          owner,
          {from: minter}
      );

      await this.garmentFactoryMatic.mintParentWithoutChildren(randomTokenURI, designer, owner, {from: minter});
      await this.garmentFactoryMatic.mintParentWithoutChildren(randomTokenURI2, designer, owner, {from: minter});

      await this.tokenV2.setPrimarySalePrice(TOKEN_ONE_ID, '12345');
      await this.tokenV2.setPrimarySalePrice(TOKEN_TWO_ID, '12345');
      await this.tokenV2.setPrimarySalePrice(TOKEN_THREE_ID, '12345');
      await this.tokenV2.setPrimarySalePrice(TOKEN_FOUR_ID, '123456');
    });

    describe('_processMessageFromChild', async () => {
      it('can successfully _processMessageFromChild', async () => {
        console.log('The owners address is');
        console.log(owner);

        const { receipt } = await this.tokenV2.sendNFTsToRoot([new BN('100002'), new BN('100003'), new BN('100004')], {from: owner})
        // await expectEvent(receipt, 'MessageSent', {
        //   message: bytesResponseL2ToL1
        // });

        // The test mock is removing onlyStateSyncer modifier
        await this.digitalaxRootTunnelMock.receiveMessage(bytesResponseL2ToL1); // Does not do Matic msg processing

        // Check children now on L1.
        await expectStrandBalanceOfGarmentToBe(new BN('1'), new BN('1'), '1');
        await expectStrandBalanceOfGarmentToBe(new BN('1'), new BN('2'), '5');
        await expectStrandBalanceOfGarmentToBe(new BN('1'), new BN('3'), '2');
        await expectStrandBalanceOfGarmentToBe(new BN('1'), new BN('4'), '2');
        await expectStrandBalanceOfGarmentToBe(new BN('1'), new BN('5'), '2');

        // Send more of nfts with same child from before
        const { receipt2 } = await this.tokenV2.sendNFTsToRoot([new BN('100001')], {from: owner})
        // await expectEvent(receipt2, 'MessageSent', {
        //   message: bytesResponseL2ToL1Next
        // });
        await this.digitalaxRootTunnelMock.receiveMessage(bytesResponseL2ToL1Next); // Does not do Matic msg processing

        await expectStrandBalanceOfGarmentToBe(new BN('4'), new BN('6'), '1');
        await expectStrandBalanceOfGarmentToBe(new BN('4'), new BN('7'), '5');
        await expectStrandBalanceOfGarmentToBe(new BN('4'), new BN('8'), '2');
        await expectStrandBalanceOfGarmentToBe(new BN('4'), new BN('9'), '2');
        await expectStrandBalanceOfGarmentToBe(new BN('4'), new BN('10'), '2');

        expect(await this.digitalaxMaterials.uri(new BN('6'))).to.be.equal(randomStrandURI);
        expect(await this.digitalaxMaterials.uri(new BN('7'))).to.be.equal(randomStrandURI2);
        expect(await this.digitalaxMaterials.uri(new BN('8'))).to.be.equal(randomStrandURI3);
        expect(await this.digitalaxMaterials.uri(new BN('9'))).to.be.equal(randomStrandURI4);
        expect(await this.digitalaxMaterials.uri(new BN('10'))).to.be.equal(randomStrandURI5);

        expect(await this.token.primarySalePrice(new BN('1'))).to.be.bignumber.equal('12345');
        expect(await this.token.primarySalePrice(new BN('2'))).to.be.bignumber.equal('12345');
        expect(await this.token.primarySalePrice(new BN('3'))).to.be.bignumber.equal('123456');
        expect(await this.token.primarySalePrice(new BN('4'))).to.be.bignumber.equal('12345');

        expect(await this.token.garmentDesigners(new BN('1'))).to.be.equal(designer);
        expect(await this.token.garmentDesigners(new BN('2'))).to.be.equal(designer);
        expect(await this.token.garmentDesigners(new BN('3'))).to.be.equal(designer);
        expect(await this.token.garmentDesigners(new BN('4'))).to.be.equal(designer);

        expect(await this.token.tokenURI(new BN('1'))).to.be.equal(randomGarmentURI2);
        expect(await this.token.tokenURI(new BN('2'))).to.be.equal(randomTokenURI);
        expect(await this.token.tokenURI(new BN('3'))).to.be.equal(randomTokenURI2);
        expect(await this.token.tokenURI(new BN('4'))).to.be.equal(randomGarmentURI);
      });
    });
  });

  // L1 to L2
  describe('transferNFTsDataToMatic()', async () => {
    beforeEach(async () => {
      await this.garmentFactory.mintParentWithoutChildren(randomTokenURI, designer, owner, {from: minter});
      await this.garmentFactory.mintParentWithoutChildren(randomTokenURI, designer, owner, {from: minter});

      this.token.setPrimarySalePrice(new BN('1'), new BN('12345'));
      this.token.setPrimarySalePrice(new BN('2'), new BN('23456'));
    });

    describe('transferNFTsDataToMatic', async () => {
      it('transferNFTsDataToMatic', async () => {
        // Comment out the below on the contract to use this test. (in this test we use a mock)
        // _sendMessageToChild(abi.encode(_tokenIds, _salePrices, _designers, _tokenUris));

        const { receipt } = await this.digitalaxRootTunnelMock.transferNFTsDataToMatic([new BN('1'), new BN('2')]);

         await expectEvent(receipt, 'MockMessageSent', {
          message: bytesResponseL1toL2
        });

        expect(await this.tokenV2.primarySalePrice(new BN('1'))).to.be.bignumber.equal('0');
        expect(await this.tokenV2.primarySalePrice(new BN('2'))).to.be.bignumber.equal('0');

        await this.tokenV2.onStateReceive(0, bytesResponseL1toL2);

        expect(await this.tokenV2.primarySalePrice(new BN('1'))).to.be.bignumber.equal('12345');
        expect(await this.tokenV2.primarySalePrice(new BN('2'))).to.be.bignumber.equal('23456');
        expect(await this.tokenV2.garmentDesigners(new BN('1'))).to.be.equal(designer);
        expect(await this.tokenV2.garmentDesigners(new BN('2'))).to.be.equal(designer);
        expect(await this.tokenV2.tokenURI(new BN('1'))).to.be.equal(randomTokenURI);
        expect(await this.tokenV2.tokenURI(new BN('2'))).to.be.equal(randomTokenURI);
      });
    });
  });

  // TODO process message from child above and then also add test for transferNFTsDataToMatic

  async function getGasCosts(receipt) {
    const tx = await web3.eth.getTransaction(receipt.tx);
    const gasPrice = new BN(tx.gasPrice);
    return gasPrice.mul(new BN(receipt.receipt.gasUsed));
  }
});
