class PinataIpfsService {

  constructor(pinata) {
    this.pinata = pinata;
  }

  async pushFileToPinata(filestream) {
    const result = await this.pinata.pinFileToIPFS(filestream);
    return {
      result,
      pinataIpfsUrl: `${process.env.PINATA_GATEWAY_URL}/${result.IpfsHash}`
    }
  }

  async pushJsonToPinata(json) {
    const result = await this.pinata.pinJSONToIPFS(json);
    return {
      result,
      pinataIpfsUrl: `${process.env.PINATA_GATEWAY_URL}/${result.IpfsHash}`
    }
  }
}

module.exports = PinataIpfsService;
