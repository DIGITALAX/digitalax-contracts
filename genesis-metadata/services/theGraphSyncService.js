const promiseRetry = require('promise-retry');
const _ = require('lodash');

const ipfsClient = require('ipfs-http-client');

//https://api.thegraph.com/ipfs/api/v0/pin/add?arg

const subgraphIpfsClient = ipfsClient({
  host: 'api.thegraph.com',
  port: '443',
  apiPath: '/ipfs/api/v0/',
  protocol: 'https'
});

const syncHashToSubgraph = async function ({fileList}) {

  if (!fileList || !_.isArray(fileList) || _.isEmpty(fileList)) {
    console.warn(`No CIDs to push`);
    return;
  }

  try {
    const onSuccess = (results) => {
      console.info(`Syncing with TheGraph - success`, results);
      return true;
    };

    const onFailure = (error) => {
      console.error(`Failed to sync with TheGraph`, fileList, error);
      throw error;
    };

    const syncWithTheGraph = async () => Promise.all(_.map(fileList, (cid) => {
      return subgraphIpfsClient.pin.add(cid);
    }));

    const retryOptions = {
      factor: 2, // The exponential factor to use for back-off
      retries: 3 // number of retries
    };

    // Attempt to pin to subgraph as well to make indexing more reliable
    return promiseRetry((retry, number) => {
      console.log(`Syncing with TheGraph - attempt [${number}]`, fileList);

      // Add basic retry to see if this fixes the occasional 502 from the graph node¬
      return syncWithTheGraph().catch((err) => {
        console.error(`Syncing with TheGraph Failure - attempt [${number}]`);
        retry(err);
      });
    }, retryOptions)
      .then(onSuccess, onFailure);

  } catch (error) {
    console.error(`Failed to sync with TheGraph`, fileList, error);
    return true;
  }
};

module.exports = {
  syncHashToSubgraph
}
