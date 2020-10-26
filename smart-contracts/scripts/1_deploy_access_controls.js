async function main() {
    const DigitalaxAccessControls = await ethers.getContractFactory('DigitalaxAccessControls');
    const accessControls = await DigitalaxAccessControls.deploy();

    await accessControls.deployed();

    console.log('DigitalaxAccessControls deployed to:', accessControls.address);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
