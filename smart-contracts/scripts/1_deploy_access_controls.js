const {FUND_MULTISIG_ADDRESS, OTHER_MULTISIG, SUPER_ADMIN} = require('./constants');

async function main() {

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log('Deploying DigitalaxAccessControls with the account:', deployerAddress);

  const DigitalaxAccessControls = await ethers.getContractFactory('DigitalaxAccessControls');
  const accessControls = await DigitalaxAccessControls.deploy();
  await accessControls.deployed();

  console.log('DigitalaxAccessControls deployed to:', accessControls.address);

  // Fund treasury multi sig
  await accessControls.addAdminRole(FUND_MULTISIG_ADDRESS);
  console.log('DigitalaxAccessControls added treasury multisig as admin:', FUND_MULTISIG_ADDRESS);

  // Super Admin account
  await accessControls.addAdminRole(SUPER_ADMIN);
  await accessControls.addMinterRole(SUPER_ADMIN);
  console.log(`DigitalaxAccessControls added an admin and minter: ${SUPER_ADMIN}`);

  // Other multisig
  await accessControls.addMinterRole(OTHER_MULTISIG);
  console.log(`DigitalaxAccessControls added minter: ${OTHER_MULTISIG}`);

  await accessControls.addVerifiedMinterRole(SUPER_ADMIN);
  await accessControls.addVerifiedMinterRole('0x1e8E749b2B578E181Ca01962e9448006772b24a2');
  await accessControls.addVerifiedMinterRole('0xF91569595BCDAF780c3f1662f204E157949af8b2');
  await accessControls.addVerifiedMinterRole('0x3d7e3FCA7123e687601dA8631fE0922a1999A3A7');
  await accessControls.addVerifiedMinterRole('0xcf9741bBcE8Ba8EC2b0dC8F23399a0BcF5C019D5');
  await accessControls.addVerifiedMinterRole('0x11142E97271D26FEBef714A117Fea7d279f77378');
  await accessControls.addVerifiedMinterRole('0x2e307Ceab1b4c5F4cAc508E3B13C3dBfe86a3c81');
  await accessControls.addVerifiedMinterRole('0x9E1F34E66aE2171b7ccb8E6bc05fd05149E2c938');
  await accessControls.addVerifiedMinterRole('0xfcad2eb79692c2aa0bcbaf3d3e29615dda94fe6d');
  await accessControls.addVerifiedMinterRole('0x65a36FF9a9F4b736Cd8a2aB2C614642af73434B0');
  await accessControls.addVerifiedMinterRole('0xe4F091560461b441ae8dc1c2dE961E002fAcD59c');

  // Optional smart contract allowlisting
  /*
  // Garment Factory - smart contract role and minter role
  const GARMENT_FACTORY = '0x0000000000000000000000000000000000000000';
  await accessControls.addMinterRole(GARMENT_FACTORY);
  await accessControls.addSmartContractRole(GARMENT_FACTORY);
  console.log(`DigitalaxAccessControls added minter and smart contract roles to garment factory: ${GARMENT_FACTORY}`);

  // Garment Collection  - smart contract role and minter role
  const GARMENT_COLLECTION = '0x0000000000000000000000000000000000000000';
  await accessControls.addMinterRole(GARMENT_COLLECTION);
  await accessControls.addSmartContractRole(GARMENT_COLLECTION);
  console.log(`DigitalaxAccessControls added minter and smart contract roles to garment collection: ${GARMENT_COLLECTION}`);

  // Auction - smart contract role
  const AUCTION = '0x0000000000000000000000000000000000000000';
  await accessControls.addSmartContractRole(AUCTION);
  console.log(`DigitalaxAccessControls added smart contract roles to auction: ${AUCTION}`);

  // Marketplace- smart contract role
  const MARKETPLACE = '0x0000000000000000000000000000000000000000';
  await accessControls.addSmartContractRole(MARKETPLACE);
  console.log(`DigitalaxAccessControls added smart contract roles to marketplace: ${MARKETPLACE}`);
   */
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
