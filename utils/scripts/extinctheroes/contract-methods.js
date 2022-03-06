const { Near, keyStores } = require('near-api-js');
const { parseContract } = require('near-contract-parser');

const near = new Near({
  networkId: 'mainnet',
  keyStore: new keyStores.InMemoryKeyStore(),
  nodeUrl: 'https://rpc.mainnet.near.org',
  archivalUrl: 'https://archival-rpc.mainnet.near.org',
  walletUrl: 'https://wallet.mainnet.near.org',
  helperUrl: 'https://helper.mainnet.near.org',
  explorerUrl: 'https://explorer.mainnet.near.org',
});

(async () => {
  const account_id = 'extinctheroes.tenk.near';
  const { code_base64 } = await near.connection.provider.query({
    account_id,
    finality: 'final',
    request_type: 'view_code',
  });

  console.log(parseContract(code_base64));
})();