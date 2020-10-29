async function main() {

    const FUND_MULTISIG_ADDRESS = '0x10C0B0DA2A682C12bD36516A95CB8474C02d83De';
    const TOKEN_URI = 'https://gateway.pinata.cloud/ipfs/QmRjiYPGEm3GkWYW6Mpp3ZGHvYA6odo8pHbPNvtTjLfYF4';

    const {
        ACCESS_CONTROLS_ADDRESS,
        GENESIS_START,
        GENESIS_END,
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
