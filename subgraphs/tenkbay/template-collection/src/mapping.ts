import { near, log, json, JSONValueKind, JSONValue, BigInt, ByteArray } from "@graphprotocol/graph-ts";
import { Account, Token, Contract, Transfer, Mint } from "../generated/schema";

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

  

  function update_user(address: string, remove: boolean, increaseTransferred: boolean, ts: string): void {
    let user = Account.load(address);
  
    // if account doesn't exist save new account
    if (!user) {
      user = new Account(address);
      user.total_owned = BigInt.zero();
      user.total_transferred = BigInt.zero();
    }
  
    if (remove == true) {
      user.total_owned = user.total_owned.minus(BigInt.fromI32(1));
    } else {
      user.total_owned = user.total_owned.plus(BigInt.fromI32(1));
    }

    if(increaseTransferred) {
      user.total_transferred = user.total_transferred.plus(BigInt.fromI32(1));
    }
    user.last_updated = ts;
    user.save();
  }

  let accounts = new Account(receipt.signerId);
  const functionCall = action.toFunctionCall();



  if (functionCall.methodName == 'nft_mint_many' || functionCall.methodName == 'nft_mint_one') {
    for (let logIndex = 0; logIndex < outcome.logs.length; logIndex++) {
      let outcomeLog = outcome.logs[logIndex].toString();

      const receiptId = receipt.id.toBase58();
      accounts.signerId = receipt.signerId;

      let mint = new Mint(`${receiptId}`);

      log.info('outcomeLog {}', [outcomeLog])

      let parsed = outcomeLog.replace('EVENT_JSON:', '')

      let jsonData = json.try_fromString(parsed)
      const jsonObject = jsonData.value.toObject()

      let eventData = jsonObject.get('data')
      if (eventData) {
        let eventArray:JSONValue[] = eventData.toArray()

        let data = eventArray[0].toObject()
        const tokenIds = data.get('token_ids')
        const owner_id = data.get('owner_id')
        if (!tokenIds || !owner_id) return

        let ids:JSONValue[] = tokenIds.toArray()

        let contract = Contract.load("mrbrownproject.near")


        if(!contract) {
          //let transactionId = account.id.concat("-").concat(event.transaction.hash.toHexString()).concat("-").concat(event.logIndex.toHexString())
          contract = new Contract("mrbrownproject.near")
          contract.id = "mrbrownproject.near"
          contract.name = "MR. BROWN"
          contract.symbol = "MRBRN"
          contract.base_uri = "https://mrbrown.nftapi.art/meta/"
          contract.media_uri = "https://cloudflare-ipfs.com/ipfs/QmP3shtToBeoeHizRtvgUPJTeGbcVn2rdZhERSwEiQHtJh/"
        }

        for(let i = 0; i < ids.length; i++) {
          const receiptId = receipt.id.toBase58();
          accounts.signerId = receipt.signerId;

            // Maps the JSON formatted log to the LOG entity
          let mint = new Mint(`${receiptId}`);
          if(ids[i].toString() != "" || ids[i].toString() != null) {
            let tokenId = ids[i].toString()

            let token = Token.load(tokenId)


            if (!token) {
              token = new Token(tokenId)
              token.tokenId = tokenId
              // exclusive to mint

              token.image = contract.media_uri + tokenId + '.png'
              const metadata = contract.base_uri + tokenId + '.json'
              token.metadata = metadata
              token.contract = contract.id
              mint.contract = contract.id
              token.mintedBy = owner_id.toString()
              // total_mints should return 1 --> testing
              token.total_mints = token.total_mints.plus(BigInt.fromI32(1));
            }

            contract.total_minted = contract.total_minted.plus(BigInt.fromI32(1));

            mint.tokenId = tokenId
            mint.nft = token.id
            mint.total_mints = mint.total_mints.plus(BigInt.fromI32(1));
            mint.ownerId = owner_id.toString()
            mint.owner = owner_id.toString()

            token.ownerId = owner_id.toString()
            token.owner = owner_id.toString()
            token.mintedBy = owner_id.toString()

            mint.idx = receiptId.toString()
            mint.timestamp = blockHeader.timestampNanosec.toString()
            mint.blockHash = blockHeader.hash.toBase58().toString()
            mint.blockHeight = blockHeader.height.toString()


            token.minted_timestamp = blockHeader.timestampNanosec.toString()
            token.minted_blockHeight = blockHeader.height.toString()

            let account = Account.load(owner_id.toString())
            if (!account) {
              account = new Account(receipt.signerId)
            }

            mint.save()
            token.save()
            account.save()
            contract.save()
          }
        }
      }
    }
  }













  // change the methodName here to the methodName emitting the log in the contract
  if (functionCall.methodName == "nft_transfer" || functionCall.methodName == "nft_transfer_payout") {
    const receiptId = receipt.id.toBase58();
    accounts.signerId = receipt.signerId;

      // Maps the JSON formatted log to the LOG entity
      let transfer = new Transfer(`${receiptId}`);
      if(outcome.logs[0]!=null){
        transfer.id = receiptId;
        transfer.idx = receiptId;

        log.info('unparsed outcome.logs[0] for nft_transfer -> {}', [outcome.logs[0]])
        

        let parsed = outcome.logs[0].replace('EVENT_JSON:', '')

        let jsonData = json.try_fromString(parsed)
        if(jsonData.value != null) {
          const jsonObject = jsonData.value.toObject()

          let eventStandard = jsonObject.get('standard')
          if(eventStandard) {
            if(eventStandard) {
              transfer.standard = eventStandard.toString()
            }
          }

          let eventVersion = jsonObject.get('version')
          if(eventVersion) {
            if(eventVersion) {
              transfer.version = eventVersion.toString()
            }
          }

          let eventEvent = jsonObject.get('event')
          if(eventEvent) {
            if(eventEvent) {
              transfer.event = eventEvent.toString()
            }
          }

          let eventData = jsonObject.get('data')
          if(eventData) {
            let eventArray:JSONValue[] = eventData.toArray()
            let data = eventArray[0].toObject()
            const authorized_id = data.get('authorized_id')
            if (authorized_id) {
              transfer.authorizedId = authorized_id.toString();
            }
            const old_owner_id = data.get('old_owner_id')
            const new_owner_id = data.get('new_owner_id')
            const tokenIds = data.get('token_ids')
            
            if (!new_owner_id || !old_owner_id || !tokenIds) return

            let contract = Contract.load("mrbrownproject.near")


            if(!contract) {
              //let transactionId = account.id.concat("-").concat(event.transaction.hash.toHexString()).concat("-").concat(event.logIndex.toHexString())
              contract = new Contract("mrbrownproject.near")
              contract.id = "mrbrownproject.near"
              contract.name = "MR. BROWN"
              contract.symbol = "MRBRN"
              contract.base_uri = "https://mrbrown.nftapi.art/meta/"
              contract.media_uri = "https://cloudflare-ipfs.com/ipfs/QmP3shtToBeoeHizRtvgUPJTeGbcVn2rdZhERSwEiQHtJh/"
            }

            const ids:JSONValue[] = tokenIds.toArray()
            const tokenId = ids[0].toString()

            let token = Token.load(tokenId)

            if(token) {
              transfer.idx = receiptId.toString()
              token.ownerId = new_owner_id.toString()
              token.owner = new_owner_id.toString()
              transfer.nft = token.id
              transfer.tokenId = token.id

              transfer.old_ownerId = old_owner_id.toString();
              transfer.new_ownerId = new_owner_id.toString();
              transfer.from = old_owner_id.toString();
              transfer.to = new_owner_id.toString();

              token.total_transfers = token.total_transfers.plus(BigInt.fromI32(1));
            }

            if (!token) {
              token = new Token(tokenId)
              token.tokenId = tokenId

              // exclusive to transfer event
              token.standard = transfer.standard
              token.version = transfer.version
              
              token.image = contract.media_uri + tokenId + '.png'
              const metadata = contract.base_uri + tokenId + '.json'
              token.metadata = metadata
              token.contract = contract.id
              token.ownerId = new_owner_id.toString()
              token.owner = new_owner_id.toString()
              transfer.nft = token.id
              transfer.tokenId = token.id
              token.total_transfers = token.total_transfers.plus(BigInt.fromI32(1));
            }

            transfer.old_ownerId = old_owner_id.toString();
            transfer.new_ownerId = new_owner_id.toString();
            transfer.from = old_owner_id.toString();
            transfer.to = new_owner_id.toString();

            transfer.timestamp = blockHeader.timestampNanosec.toString();
            //blockHeader.hash
            // added 3rd param to increase total number of transfers
            update_user(new_owner_id.toString(), false, true, transfer.timestamp);
            update_user(old_owner_id.toString(), true, true, transfer.timestamp);



            token.save()
            contract.save()
          }
        }
        transfer.save()
      }
      
  } else {
    log.info("Not processed - FunctionCall is: {}", [functionCall.methodName]);
  }

  accounts.save();
}