# **NEAR Subgraphs**

## **What is a Subgraph?**

Put simply, a subgraph is an index of specific events, actions, and data on the blockchain. Creating a subgraph of a contract’s events requires traversal of the entire blockchain to index, recording these events in a data store defined by a schema within the subgraph’s source code. Once complete, this data store will be queryable via GraphQL by clients or other consumers of the data.

## **Why Build a Subgraph?**

Subgraphs allow clients to query on-chain information that’s functionally cached off-chain. Without a subgraph, a client who wanted to fetch the ownership data for a given token or NFT contract, for example, would need to iterate through the entire blockchain and compile the data themselves. Subgraphs enable clients to make complex queries and return results much more quickly than iterating through the blockchain, so if a client plans on requesting a certain type of data more than once, building a subgraph is probably the best path forward.

## **Three Parts of a Subgraph**

### 1. **Schema**

The schema file is where you define all entities you want stored in your subgraph. These entities are defined using GraphQL, and will be used by The Graph to generate model files for use in the mapping, and corresponding data store to persist entries.

For any given entity, you define it like you would any other data schema in GraphQL. For example, a simple NFT entity that maps to the [NEP-177](https://nomicon.io/Standards/NonFungibleToken/Metadata) might look something like this:

```
type NFT @entity {
  id: ID!

  # NEP-177
  title: String
  description: String
  media: String
  media_hash: String
  copies: BigInt
  issued_at: BigInt
  expires_at: BigInt
  starts_at: BigInt
  updated_at: BigInt
  extra: String
  reference: String
  reference_hash: String
}
```

You can also create more complicated types, and relationships between entities. For example, in the above GraphQL sample you might add a Contract entity and a User entity, and store information like ownership, collection metadata, etc.

For more information on GraphQL Schemas, see the GraphQL documentation on [Schemas and Types](https://graphql.org/learn/schema/).

For more information on schemas for subgraphs, see documentation by [The Graph](https://thegraph.com/docs/en/developer/create-subgraph-hosted/#the-graph-ql-schema).

### 2. **Manifest**

The subgraph manifest is a [YAML](https://yaml.org/) file that contains the metadata required to build the subgraph, such as locations of the schema and mapping file, the entities to generate from the schema, the contract address to index, the events to monitor, and a link to the repository with the source code. The structure is standardized by [The Graph](https://thegraph.com/docs/en/developer/create-subgraph-hosted/#the-subgraph-manifest) and should be simple to fill in.

An example manifest file:

```
specVersion: 0.0.4
schema:
  file: ./schema.graphql
features:
  - ipfsOnEthereumContracts
  - fullTextSearch
dataSources:
  - kind: near
    name: Mrbrownproject
    network: near-mainnet
    source:
      account: "mrbrownproject.near"
      startBlock: 59140000
    mapping:
      apiVersion: 0.0.5
      language: wasm/assemblyscript
      entities:
        - Token
        - User
        - Contract
      receiptHandlers:
        - handler: handleReceipt
      file: ./src/mapping.ts
```

_Note: any given manifest can have multiple entries and serve multiple subgraphs._

### 3. **Mapping**

The Mapping is an [assemblyscript](https://www.assemblyscript.org/introduction.html) file designated in the Manifest (generally named mapping.ts) that contains a callback that’s triggered when certain events are detected on-chain. This callback receives data for a given transaction from the NEAR blockchain, maps this data to the entities defined in the schema, and saves it to the index. Once data is stored in the index, it’s queryable via GraphQL. The Graph has some great documentation on mappings [here](https://thegraph.com/docs/en/developer/create-subgraph-hosted/#writing-mappings).

## **Building Your Own Subgraph**

### **Installing the Graph CLI**

The first step in building your own subgraph is installing the global Graph CLI. You will need Node and Yarn installed on your computer

- If you don’t have Node installed, we recommend you use [Node Version Manager](https://github.com/nvm-sh/nvm). This will install both Node and the Node Package Manager (npm)
- If you don’t have Yarn installed, run `npm install --global yarn`

\_Note: If you just installed Node or Yarn, you’ll have to reset your terminal. Running the <code>reset</code> command in your terminal will handle this for you</em>

Once you have Node and Yarn installed, run the following command:

```
yarn global add @graphprotocol/graph-cli
```

### **Create your hosted service**

The Graph provides some dev infra called Hosted Service, which will host your subgraphs for free. To begin:

- go to [https://thegraph.com/hosted-service/](https://thegraph.com/hosted-service/) and login with Github.
- Click the “My Dashboard” button on the top of the screen, and click “Add Subgraph”.
- Within the subgraph creation form, you must provide a subgraph name and subtitle within the form, and you can choose to provide optional parameters such as a description, an image, and a github URL for the subgraph repository if you’ve already set one up.
- Click “Create Subgraph”

### **Create your subgraph repository and generate scaffolding**

- In your terminal, create a new directory, `cd` into that directory, and run `graph init -product hosted-service &lt;GITHUB_USER>/&lt;SUBGRAPH_NAME>`, where &lt;GITHUB_USER> is your Github username and &lt;SUBGRAPH_NAME> is the name you gave the subgraph we created above.
- Next, run `yarn install && yarn codegen`. These commands will install any required dependencies, and generate the basic data model types from the default GraphQL provided by the `graph init` command.
- If those commands didn’t spit out any errors, run `yarn deploy` to deploy your first subgraph!

_Note: after waiting a minute, reload your hosted service page, and you should see that indexing has begun!_

### **Filling in your subgraph**

Now that you’ve officially deployed your first subgraph to the Hosted Service, it’s time to fill in the three pieces of the subgraph that we discussed earlier: **the Schema**, **the Manifest**, and **the Mapping**.

#### **Manifest**

Let’s start with the Manifest. Thankfully, the `graph init` step should have filled in everything we need inside the Manifest file, so we shouldn’t have to make any changes yet.

However, if you want to make your subgraph more efficient, feel free to update the `startBlock` field of your data source(s), which indicates where on-chain indexing should begin.

For example, if you’re writing a subgraph for an NFT contract that just launched three days ago, you don’t need to index the entire history of the blockchain. Instead, you only need the history of the blockchain starting three days ago because any transactions before the NFT contract was deployed won’t be relevant for the purposes of your subgraph.

#### **Schema**

Next, you’ll need to fill in your data schema. Like we discussed above, the schema defines the structure of your subgraph by specifying what fields your data models have and the relationships among these models. You’ll have to determine what data models best suit your use case and add them to your `schema.graphql` file.

For example, a very simple token data model might look something like this:

```
type Token @entity {
  id: ID!
  ownerId: String
}
```

Once you’ve done that, be sure to re-run `yarn codegen` to make sure you re-generate your data models to use in your mapping.

#### **Mapping**

Lastly, you need to fill in the meat of the subgraph: the mapping code. Again, the mapping is where we extract data from on-chain transactions and write them to our data store using the types generated from our schema.

To do this, first you need to determine which function calls you want to monitor, and filter by those function calls. For example, if you were looking to index NFT ownership, you might want to monitor transfers of NFTs on a given contract. This would generally look something like this:

```
export function handleReceipt(receipt: near.ReceiptWithOutcome): void {
  const actions = receipt.receipt.actions;

  for (let i = 0; i < actions.length; i++) {
    handleAction(
      actions[i],
      receipt.receipt,
      receipt.block.header,
      receipt.outcome
      );
  }
}

function handleAction(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  blockHeader: near.BlockHeader,
  outcome: near.ExecutionOutcome
): void {
  if (action.kind != near.ActionKind.FUNCTION_CALL) {
    log.info("Early return: {}", ["Not a function call"]);
    return;
  }

  let accounts = new Account(receipt.signerId);
  const functionCall = action.toFunctionCall();
  if (functionCall.methodName == "nft_transfer") {
	...
  }
}
```

From there, you would parse the JSON from the outcome logs, and write the relevant data to your schema. For example, your parsing logic might look something like this:

```
if (functionCall.methodName == "nft_transfer") {
  const receiptId = receipt.id.toBase58();
  accounts.signerId = receipt.signerId;

    // Maps the JSON formatted log to the LOG entity
  if(outcome.logs[0]!=null){
    let parsed = outcome.logs[0].replace('EVENT_JSON:', '')

    let jsonData = json.try_fromString(parsed)
    if(jsonData.value != null) {
      const jsonObject = jsonData.value.toObject()

      let eventData = jsonObject.get('data')
      if(eventData) {
        let eventArray:JSONValue[] = eventData.toArray()
        let data = eventArray[0].toObject()
        const new_owner_id = data.get('new_owner_id')
        const tokenIds = data.get('token_ids')

        const ids:JSONValue[] = tokenIds.toArray()
        const tokenId = ids[0].toString()

        let token = Token.load(tokenId)

        if (!token) {
          token = new Token(tokenId)
          token.id = tokenId

          token.ownerId = new_owner_id.toString()
        }

        token.save()
     }
}
```

### **Re-deploy your subgraph**

Once you’ve written your mapping code and filled in your schema, simply run `yarn deploy` again! This will re-deploy your subgraph onto the hosted service and begin the indexing job again.

### **Querying your subgraph**

Once your subgraph is fully indexed, you’ll be able to query it within the Hosted Service. As an example, here’s a simple query we could run on a subgraph generated using the above schema and mapping.

```
{
  tokens(first: 5) {
    id
    ownerId
  }
}
```

This query, as you might expect, will return the first 5 tokens, and each token data model will contain the token ID and the owner ID. After typing that into the query field within the Hosted Service, simply click the Run button and wait for the response from your subgraph.

_Note: Your query will not succeed until a certain portion of the chain has been indexed. After all, before your indexing is complete, the data isn’t in your subgraph in the first place so there’s no way to query it._

Here’s a sample response for a query like the one above:

```
{
  "data": {
    "tokens": [
      {
        "id": "100",
        "ownerId": "azhyel.near"
      },
      {
        "id": "1001",
        "ownerId": "uncutgems.near"
      },
      {
        "id": "1012",
        "ownerId": "fbdaa19a39ffce9c26c0613fee064481d3d59fd9f5a2934a982adefc5b21339c"
      },
      {
        "id": "1025",
        "ownerId": "2f18219d1d7ca1638526ecde288a7a935266aaa6264a7c05ac00c18310c2f0d8"
      },
      {
        "id": "103",
        "ownerId": "enderr.near"
      }
    ]
  }
}
```

GraphQL also enables you to make much more complex queries than this, such as sorting, filtering, nested queries, etc. For more information about that, see the GraphQL documentation.

That’s it! You’ve officially deployed and queried your subgraph.
