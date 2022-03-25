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
    console.log('Deploying the next guild');

    // // Some constants setup
    const accessControlsAddress = "0xbe5c84e6b036cb41a7a6b5008b9427a5f4f1c9f5";
    const trustedForwarderAddress = "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8";
    // const accessControlsAddress = "0xf7580d46080e1ce832ac44cf7224b906d44110b4";
    // const trustedForwarderAddress = "0x9399BB24DBB5C4b782C70c2969F58716Ebbd6a3b";
    const rewardsDistributed = "0";
    const tokenWhitelist = [
        "0x7B2a989c4D1AD1B79a84CE2EB79dA5D8d9C2b7a7",
        "0x2953399124f0cbb46d2cbacd8a89cf0599974963",
        "0x2b9bd413852401a7e09c77de1fab53915f8f9336",
        "0x5bc808062b6d36f0c6013c4ac662a8ba4f0cb5ea",
        "0x2d0d9b4075e231bff33141d69df49ffcf3be7642",
        "0xbccaa7acb552a2c7eb27c7eb77c2cc99580735b9",
        "0xa5f1ea7df861952863df2e8d1312f7305dabf215",
        "0xfd12ec7ea4b381a79c78fe8b2248b4c559011ffb"
    ];

    const decoTokenAddress = "0x200F9621cBcE6ed740071ba34fdE85eE03f2e113";
    const decoOracleAddress = "0xCFB6d9134e2742512883E8D68c6166B480Bf1875";


    const podeNFTv2TokenAddress = "0x6d4d0b9eacd6197b31bec250c0ad6cec98f8b83f";
    const lgtTokenAddress = "0xdae2c7570bcafc8157a8395ed19ea6ccbfe10147";
    const gdnTokenAddress = "0x6A64FfDEfa171437f07b46682622b24f8969400E";


    console.log('deco deployed');

    // Deploy membership guild staking
    const NFTStakingFactory = await ethers.getContractFactory("GuildNFTStakingV3");
    const nftStaking = await upgrades.deployProxy(NFTStakingFactory, []);

    const originalStakingAddress = nftStaking.address;
   // const decoTokenAddress = decoToken.address;
   // const decoOracleAddress = decoOracle.address;

    const accessControls = new ethers.Contract(
        accessControlsAddress,
        AccessControlsArtifact.abi,
        deployer
    );

  const WhitelistedNFTStakingFactory = await ethers.getContractFactory("GuildWhitelistedNFTStakingV3");
  const whitelistedNFTStaking = await upgrades.deployProxy(WhitelistedNFTStakingFactory, []);
  console.log('The whitelisted nft staking is deployed to:');
  console.log(whitelistedNFTStaking.address);

  const StakingWeightStorage = await ethers.getContractFactory("GuildNFTStakingWeightV2Storage");
  const instanceStakingWeightStorage = await upgrades.deployProxy(StakingWeightStorage, ["0x0000000000000000000000000000000000000000",accessControlsAddress]);
  await instanceStakingWeightStorage.deployed();

  const StakingWeight = await ethers.getContractFactory("GuildNFTStakingWeightV4");
  const instanceStakingWeight = await upgrades.deployProxy(StakingWeight,
      [originalStakingAddress,
          whitelistedNFTStaking.address,
        decoTokenAddress,
        accessControlsAddress,
        instanceStakingWeightStorage.address
      ]);
  await instanceStakingWeight.deployed();

  const StakingRewards = await ethers.getContractFactory("GuildNFTRewardsV3");
  const instanceStakingRewards = await upgrades.deployProxy(StakingRewards,
      [
          decoTokenAddress,
        accessControlsAddress,
        originalStakingAddress,
          whitelistedNFTStaking.address,
          decoOracleAddress,
          trustedForwarderAddress,
        rewardsDistributed
      ]);
  await instanceStakingRewards.deployed();

    const stakingInit = await nftStaking.initStaking(
        decoTokenAddress,
        gdnTokenAddress,
        accessControlsAddress,
        instanceStakingWeight.address,
        trustedForwarderAddress);

    const whitelistedStakingInit = await whitelistedNFTStaking.initStaking(
            decoTokenAddress,
            accessControlsAddress,
            instanceStakingWeight.address,
            trustedForwarderAddress );
    await whitelistedStakingInit.wait();

    await instanceStakingWeightStorage.updateWeightContract(instanceStakingWeight.address);

    console.log('tokens claimable');
    const setTokensClaimable2 = await nftStaking.setTokensClaimable(true);
    await setTokensClaimable2.wait();
    console.log('minter');

    console.log('tokens claimable');
    const setTokensClaimable = await whitelistedNFTStaking.setTokensClaimable(true);
    await setTokensClaimable.wait();
    console.log('minter');

    // const acr2 = await accessControls.addMinterRole(instanceStakingRewards.address);
    // await acr2.wait();

    console.log('weight points');
    await instanceStakingRewards.setWeightPoints('5000000000000000000000000000000000000', '5000000000000000000000000000000000000');

    console.log('rewardscontract');
    const updateRewardContract = await whitelistedNFTStaking.setRewardsContract(instanceStakingRewards.address);
    await updateRewardContract.wait();

    console.log('rewardscontract2');
    const updateRewardContract2 = await nftStaking.setRewardsContract(instanceStakingRewards.address);
    await updateRewardContract2.wait();

    console.log('setrewards');
    // const mintedrewards = await instanceStakingRewards.setMintedRewards([0,1,2], Array(14).fill('4128750000000000000000000'));
    // await mintedrewards.wait();

    const start = await instanceStakingRewards.setStartTime(1639683109);
    await start.wait();

    console.log('whitelisting');
    // const whitelisted = await whitelistedNFTStaking.addWhitelistedTokens(tokenWhitelist, Array(tokenWhitelist.length).fill('false'),  Array(tokenWhitelist.length).fill('false'));
    // await whitelisted.wait();

  console.log('the tokens have been deployed');
  console.log(`The storage: ${instanceStakingWeightStorage.address} (make sure to update weight contract)`);
  console.log(`The weight: ${instanceStakingWeight.address} `);
  console.log(`The rewards: ${instanceStakingRewards.address} `);
  console.log(`The nft staking: ${nftStaking.address} `);
  console.log(`The whitelisted nft staking: ${whitelistedNFTStaking.address} `);

  // TODO after add the whitelist of nft tokens, add rewards tokens, approve the token expenditures, check start times, check current week and deposit rewards

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
