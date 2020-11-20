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

  // TODO: should anyone be given this by default?
  await accessControls.addMinterRole('0xd4a3A8188aAA583057dB1A68224deA8EC1e582e3');
  await accessControls.addMinterRole('0xD677AEd0965AC9B54e709F01A99cEcA205aebC4B');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
