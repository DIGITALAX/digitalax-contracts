const FactoryArtifact = require('../../artifacts/DigitalaxGarmentFactory.json');
const AuctionArtifact = require('../../artifacts/DigitalaxAuction.json');
const GarmentArtifact = require('../../artifacts/DigitalaxGarmentNFT.json');
const AccessControlsArtifact = require('../../artifacts/DigitalaxAccessControls.json');
const {FUND_MULTISIG_ADDRESS} = require('../constants'); // This address you must be in control of so you can do token approvals

async function main() {
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log(
        'Deploying parents and setting up auction with the following address:',
        deployerAddress
    );

    const {GARMENT_FACTORY_ADDRESS, AUCTION_ADDRESS, ERC721_GARMENT_ADDRESS, ACCESS_CONTROLS_ADDRESS} = process.env;
    console.log(`GARMENT_FACTORY_ADDRESS found [${GARMENT_FACTORY_ADDRESS}]`);

    const factory = new ethers.Contract(
        GARMENT_FACTORY_ADDRESS,
        FactoryArtifact.abi,
        deployer
    );

    const garment = new ethers.Contract(
        ERC721_GARMENT_ADDRESS,
        GarmentArtifact.abi,
        deployer
    );

    const auction = new ethers.Contract(
        AUCTION_ADDRESS,
        AuctionArtifact.abi,
        deployer
    );

    const accessControls = new ethers.Contract(
        ACCESS_CONTROLS_ADDRESS,
        AccessControlsArtifact.abi,
        deployer
    );

    //
    // const auctionTx = await auction.updateAuctionEndTime(
    //     1, 1616785200
    // );
    //
    // await auctionTx.wait();
    //
    // const auctionTx2 = await auction.updateAuctionEndTime(
    //     2, 1616785200
    // );
    //
    // await auctionTx2.wait();
    //
    // const auctionTx3 = await auction.updateAuctionEndTime(
    //     3, 1616785200
    // );
    //
    // await auctionTx3.wait();
    //
    // const auctionTx4 = await auction.updateAuctionEndTime(
    //     4, 1616785200
    // );
    //
    // await auctionTx4.wait();


    const createOfferTx = await auction.toggleIsPaused();

    await createOfferTx.wait();

    const paused = await auction.isPaused();
    console.log(paused);

    console.log(`----------------------`);
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
