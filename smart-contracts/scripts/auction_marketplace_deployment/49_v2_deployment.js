// const GuildNftStakingArtifact = require('../../artifacts/contracts/staking/GuildNFTStakingWeightV2.sol/GuildNFTStakingWeightV2.json');
// const GuildNftStakingArtifact = require('../../artifacts/contracts/staking/GuildNFTStakingWeightV2.sol/GuildNFTStakingWeightV2.json');
const { ethers, upgrades } = require("hardhat");

const {
    ether,
} = require('@openzeppelin/test-helpers');

const AccessControlsArtifact = require('../../artifacts/contracts/DigitalaxAccessControls.sol/DigitalaxAccessControls.json');

const _ = require('lodash');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

    // const {ACCESS_CONTROLS_ADDRESS} = process.env;
    // console.log(`ACCESS_CONTROLS_ADDRESS found [${ACCESS_CONTROLS_ADDRESS}]`);

    const accessControls = new ethers.Contract(
        "0xf7580d46080e1ce832ac44cf7224b906d44110b4",
        AccessControlsArtifact.abi,
        deployer
    );

  const WhitelistedNFTStaking = await ethers.getContractFactory("GuildWhitelistedNFTStaking");
  const whitelistedNFTStaking = await WhitelistedNFTStaking.deploy();
  console.log('The whitelisted nft staking is deployed to:');
  console.log(whitelistedNFTStaking.address);

  const StakingWeightStorage = await ethers.getContractFactory("GuildNFTStakingWeightV2Storage");
  const instanceStakingWeightStorage = await upgrades.deployProxy(StakingWeightStorage, ["0x0000000000000000000000000000000000000000","0xf7580d46080e1ce832ac44cf7224b906d44110b4"]);
  await instanceStakingWeightStorage.deployed();

  const StakingWeight = await ethers.getContractFactory("GuildNFTStakingWeightV2");
  const instanceStakingWeight = await upgrades.deployProxy(StakingWeight,
      ["0x665bF9Ea8E3036088a6C767b0184cA4A4f13AD67",
          whitelistedNFTStaking.address,
        "0xbcd79f68a91500a2cc7c29e3aaa80046cda29833",
        "0xf7580d46080e1ce832ac44cf7224b906d44110b4",
        instanceStakingWeightStorage.address
      ]);
  await instanceStakingWeight.deployed();

  const StakingRewards = await ethers.getContractFactory("GuildNFTRewardsV2");
  const instanceStakingRewards = await upgrades.deployProxy(StakingRewards,
      [
          "0xbcd79f68a91500a2cc7c29e3aaa80046cda29833",
        "0xf7580d46080e1ce832ac44cf7224b906d44110b4",
        "0x665bF9Ea8E3036088a6C767b0184cA4A4f13AD67",
          whitelistedNFTStaking.address,
        "0x3d25C78740EF6519AfE4266a972c1c7e6934EC02",
        "0x9399BB24DBB5C4b782C70c2969F58716Ebbd6a3b",
        "19511605390211640209994124"
      ]);
  await instanceStakingRewards.deployed();

    const stakingInit = await whitelistedNFTStaking.initStaking(
        "0xbcd79f68a91500a2cc7c29e3aaa80046cda29833",
            "0xf7580d46080e1ce832ac44cf7224b906d44110b4",
            instanceStakingWeight.address,
            "0x9399BB24DBB5C4b782C70c2969F58716Ebbd6a3b" );
    await stakingInit.wait();

    await instanceStakingWeightStorage.updateWeightContract(instanceStakingWeight.address);

    console.log('tokens claimable');
    const setTokensClaimable = await whitelistedNFTStaking.setTokensClaimable(true);
    await setTokensClaimable.wait();
    console.log('minter');

    const acr2 = await accessControls.addMinterRole(instanceStakingRewards.address);
    await acr2.wait();

    console.log('weight points');
    // TODO staking set weight points
    await instanceStakingRewards.setWeightPoints('5000000000000000000000000000000000000', '5000000000000000000000000000000000000');

    // TODO staking set rewards contract
    console.log('rewardscontract');
    const updateRewardContract = await whitelistedNFTStaking.setRewardsContract(instanceStakingRewards.address);
    await updateRewardContract.wait();

    // TODO staking set rewards quantities
    console.log('setrewards');
    await instanceStakingRewards.setRewards([0], ['4128750000000000000000000']);
    await instanceStakingRewards.setRewards([1], ['4128750000000000000000000']);
    await instanceStakingRewards.setRewards([2], ['4128750000000000000000000']);
    await instanceStakingRewards.setRewards([3], ['4128750000000000000000000']);

    // TODO set the rewards and weight contract on original pode nft staking contract
    console.log('whitelisting');
    const whitelisted = await whitelistedNFTStaking.addWhitelistedTokens(["0x1Bc6D640710759Be37E5DCD1b23B322250353751"]);
    await whitelisted.wait();

  console.log('the tokens have been deployed');
  console.log(`The storage: ${instanceStakingWeightStorage.address} (make sure to update weight contract)`);
  console.log(`The weight: ${instanceStakingWeight.address} `);
  console.log(`The rewards: ${instanceStakingRewards.address} `);
  console.log(`The whitelisted nft staking: ${whitelistedNFTStaking.address} `);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
