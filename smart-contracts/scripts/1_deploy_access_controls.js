const {FUND_MULTISIG_ADDRESS} = require('./constants');

async function main() {

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log('Deploying DigitalaxAccessControls with the account:', deployerAddress);

  const DigitalaxAccessControls = await ethers.getContractFactory('DigitalaxAccessControls');
  const accessControls = await DigitalaxAccessControls.deploy();
  await accessControls.deployed();

  console.log('DigitalaxAccessControls deployed to:', accessControls.address);

  await accessControls.addAdminRole(FUND_MULTISIG_ADDRESS);
  console.log('DigitalaxAccessControls added multisig as admin:', accessControls.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
