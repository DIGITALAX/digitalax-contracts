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
  await accessControls.addAdminRole('0x9683BB5f133d24Ce2c8ACFAaee3D83C118E72503');
  console.log('DigitalaxAccessControls added an admin:', '0x9683BB5f133d24Ce2c8ACFAaee3D83C118E72503');

  // TODO: should anyone be given this by default?
  await accessControls.addMinterRole('0xd4a3A8188aAA583057dB1A68224deA8EC1e582e3');
  await accessControls.addMinterRole('0xD677AEd0965AC9B54e709F01A99cEcA205aebC4B');
  await accessControls.addMinterRole('0x9683BB5f133d24Ce2c8ACFAaee3D83C118E72503');
  await accessControls.addMinterRole('0x9411EFB374Ed3642Ac5E7f16FbE3857B9607ce4b');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
