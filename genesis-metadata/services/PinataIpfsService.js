class PinataIpfsService {

  constructor(pinata) {
    this.pinata = pinata;
  }

  async pushFileToPinata(filestream) {
    const result = await this.pinata.pinFileToIPFS(filestream);
    return {
      result,
      pinataIpfsUrl: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`
    }
  }

  async pushJsonToPinata(json) {
    const result = await this.pinata.pinJSONToIPFS(json);
    return {
      result,
      pinataIpfsUrl: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`
    }
  }
}

module.exports = PinataIpfsService;
