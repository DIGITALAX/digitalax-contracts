const { ethers, upgrades } = require("hardhat");

const {
    ether,
    BN
} = require('@openzeppelin/test-helpers');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
    console.log('Maker script');

    // Some constants setup
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    const monaAddress = "0xefd3d060ddcfed7903806503440db1089031af3a";
    const nixAddress = "0xd365287fDcE62981b6Dd158279B1161995d3862a";
    const nftAddress = "0x1bc6d640710759be37e5dcd1b23b322250353751";
    const tokenId = '101862';
    const price = '0';


    const NFTArtifact = require('../../artifacts/contracts/garment/DigitalaxGarmentNFTv2.sol/DigitalaxGarmentNFTv2.json');
    const nft = new ethers.Contract(
        nftAddress,
        NFTArtifact.abi,
        deployer
    );

    const approveToken = await nft.setApprovalForAll(nixAddress, true);
    await approveToken.wait();

    const MonaArtifact = require('../../artifacts/contracts/ERC20/MONA.sol/MONA.json');
    const mona = new ethers.Contract(
        monaAddress,
        MonaArtifact.abi,
        deployer
    );

    const approveMona = await mona.approve(nixAddress, '10000000000000000000000');
    await approveMona.wait();

    console.log('both tokens approved here');

  const NixArtifact = require('../../artifacts/contracts/Nix.sol/Nix.json');
    const nix = new ethers.Contract(
        nixAddress,
        NixArtifact.abi,
        deployer
    );
  console.log(`Nix contract at: ${nix.address}`);

  const makeOrder = await nix.addOrder(nftAddress, ZERO_ADDRESS, 1, 0, [tokenId], price, 0, '5', 0, nftAddress);

  await makeOrder.wait();

  console.log('Order submitted');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });



