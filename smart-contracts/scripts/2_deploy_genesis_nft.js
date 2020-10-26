async function main() {
    const {
        ACCESS_CONTROLS_ADDRESS,
        FUND_MULTISIG_ADDRESS,
        GENESIS_START,
        GENESIS_END,
        TOKEN_URI,
    } = process.env;

    const DigitalaxGenesisNFT = await ethers.getContractFactory('DigitalaxGenesisNFT');
    const genesis = await DigitalaxGenesisNFT.deploy(
        ACCESS_CONTROLS_ADDRESS,
        FUND_MULTISIG_ADDRESS,
        GENESIS_START,
        GENESIS_END,
        TOKEN_URI,
    );

    await genesis.deployed();

    console.log('DigitalaxGenesisNFT deployed to:', genesis.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
