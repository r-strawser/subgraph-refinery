import { near, log, json, JSONValueKind, JSONValue, BigInt, ByteArray } from "@graphprotocol/graph-ts";
import { Account, Token, Contract, Transfer, Mint, Royalty } from "../generated/schema";

export function handleReceipt(
  receiptWithOutcome: near.ReceiptWithOutcome
  ): void {

    const receipt = receiptWithOutcome.receipt;
    const outcome = receiptWithOutcome.outcome;
    const block = receiptWithOutcome.block;

    const actions = receipt.actions;
    for(let i = 0; i < actions.length; i++) {
      log.info("Receipt actions: kind: {}, data: {}", [actions[i].kind.toString(), actions[i].data.toString()]);
    }

  for (let i = 0; i < actions.length; i++) {
    handleAction(
      actions[i],
      receipt,
      block,
      outcome
      );
  }
}

function handleAction(
  action: near.ActionValue,
  receipt: near.ActionReceipt,
  block: near.Block,
  outcome: near.ExecutionOutcome
): void {
  
  if (action.kind != near.ActionKind.FUNCTION_CALL) {
    log.info("Early return: {}", ["Not a function call"]);
    return;
  }

  const functionCall = action.toFunctionCall();

  // assign royalties to each account after a market sale
  // old_owner_id == seller
  // new_owner_id == buyer
  function assign_royalties(status_value: string, receipt_id: string, token_id: string, seller: string, buyer: string, signer: string, receiver: string, predecessor: string, ts: string): void {
    log.info("BEGIN - assign_royalties - outcome status value: {}", [status_value]);
    //log.info("POST - Assign_Royalties - resultOutcome status value: {}", [resultOutcome.status.toValue().toString()]);
    let jsonResultData = json.try_fromString(status_value)
    
    if(jsonResultData.value != null) {
      const jsonObject = jsonResultData.value.toObject()
  
      let resultData = jsonObject.get('payout')
      if(resultData) {
        let resultObject = resultData.toObject();
        let payout_entriesLength = resultObject.entries.length;

        let salePrice = 0;
        //let royalties = BigInt.zero();
        let arrAddresses = new Array<string>();
        let arrAmounts = new Array<string>();
        for(let i = 0; i < resultObject.entries.length; i++) {
          arrAddresses.push(resultObject.entries[i].key.toString());
          arrAmounts.push(resultObject.entries[i].value.toString());

          // let user = Account.load(resultObject.entries[i].key.toString());
  
          // if account doesn't exist save new account
          // if (!user) {
          //   user = new Account(resultObject.entries[i].key.toString());
          //   log.info("ACCOUNT CREATED: {}", [user.id]);
          //   user.total_owned = BigInt.zero();
          //   user.total_transferred = BigInt.zero();
          //   user.total_royalties_received = BigInt.zero();
          // }

          //user.total_royalties_received = user.total_royalties_received.plus(resultObject.entries[i].value.toBigInt());
          //salePrice = salePrice + parseInt(resultObject.entries[i].value.toString()) as i32;


          //user.save();
        }

        //let sale = BigInt.zero();
        // for(let i = 0; i < arrAddresses.length; i++) {
        //   if(seller == json.fromString(arrAddresses[i]).toString()) {
        //     // add to royalties
        //   }
        // }

        let sale = BigInt.zero();
        for(let i = 0; i < arrAmounts.length; i++) {
          sale = sale.plus(json.fromString(arrAmounts[i]).toBigInt());
        }

        let royalty = new Royalty(`${token_id}`)
        let token = Token.load(`${token_id}`)
        if(token) {
          token.prev_sale_price = sale;
          royalty.nft = token.id;
          token.save();
        }
        royalty.tokenId = token_id;
        royalty.idx = receipt_id;
        royalty.timestamp = ts;
        royalty.payout_addresses = arrAddresses;
        royalty.payout_amounts = arrAmounts;
        //royalty.addresses = arrAddresses;
        royalty.sale_price = sale;
        royalty.associated_transfer = receipt_id;

        royalty.seller = seller;
        royalty.buyer = buyer;
        royalty.signerId = signer;
        royalty.receiverId = receiver;
        royalty.predecessorId = predecessor;

        royalty.save();
      }
    }
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

  if (functionCall.methodName == 'nft_mint_one' || functionCall.methodName == 'nft_mint_many' || functionCall.methodName == 'link_callback' || functionCall.methodName == 'nft_mint') {
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

        let contract = Contract.load("extinctheroes.tenk.near")

        if(!contract) {
          // for multiple contracts use --> let transactionId = account.id.concat("-").concat(event.transaction.hash.toHexString()).concat("-").concat(event.logIndex.toHexString())
          contract = new Contract("extinctheroes.tenk.near")
          contract.id = "extinctheroes.tenk.near"
          contract.name = "NEAR Extinct Heroes"
          contract.symbol = "extinctheroes"
          contract.base_uri = "https://ipfs.io/ipfs/bafybeifry66qavug4hbo2kaa5brsltcr73yeax4b6sstf2dbrlr2kj6gj4/"
          contract.media_uri = "https://ipfs.io/ipfs/bafybeifry66qavug4hbo2kaa5brsltcr73yeax4b6sstf2dbrlr2kj6gj4/"
          contract.copies = "2000"
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
            mint.timestamp = block.header.timestampNanosec.toString()
            mint.blockHash = block.header.hash.toBase58().toString()
            mint.blockHeight = block.header.height.toString()


            token.minted_timestamp = block.header.timestampNanosec.toString()
            token.minted_blockHeight = block.header.height.toString()

            // let account = Account.load(owner_id.toString())
            // if (!account) {
            //   account = new Account(owner_id.toString())
            //   account.total_owned = BigInt.zero();
            //   account.total_transferred = BigInt.zero();
            //   account.total_royalties_received = BigInt.zero();
            // }

            accounts.total_owned = accounts.total_owned.plus(BigInt.fromI32(1));
            accounts.last_updated = mint.timestamp;
            //update_user(owner_id.toString(), false, false, mint.timestamp);

            mint.save()
            token.save()
            accounts.save()
            contract.save()
          }
        }
      }
    }
  }

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
            // if authorized_id !null, then 'nft_transfer_payout'
            // then track and transfer and sale (royalties) --> only available
            // in contracts that include/emit the 'authorized_id' field in their logs
            if (authorized_id) {
              transfer.authorizedId = authorized_id.toString();
            }
            const old_owner_id = data.get('old_owner_id')
            const new_owner_id = data.get('new_owner_id')
            const tokenIds = data.get('token_ids')
            
            if (!new_owner_id || !old_owner_id || !tokenIds) return

            let contract = Contract.load("extinctheroes.tenk.near")


          if(!contract) {
            //let transactionId = account.id.concat("-").concat(event.transaction.hash.toHexString()).concat("-").concat(event.logIndex.toHexString())
            contract = new Contract("extinctheroes.tenk.near")
            contract.id = "extinctheroes.tenk.near"
            contract.name = "NEAR Extinct Heroes"
            contract.symbol = "extinctheroes"
            contract.base_uri = "https://ipfs.io/ipfs/bafybeifry66qavug4hbo2kaa5brsltcr73yeax4b6sstf2dbrlr2kj6gj4/"
            contract.media_uri = "https://ipfs.io/ipfs/bafybeifry66qavug4hbo2kaa5brsltcr73yeax4b6sstf2dbrlr2kj6gj4/"
            contract.copies = "2000"
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
            token.prev_ownerId = old_owner_id.toString();

            transfer.timestamp = block.header.timestampNanosec.toString();

            // added 3rd param to increase total number of transfers
            update_user(new_owner_id.toString(), false, true, transfer.timestamp);
            update_user(old_owner_id.toString(), true, true, transfer.timestamp);

            
            if(functionCall.methodName == "nft_transfer") {
              transfer.is_marketSale = "false";
            }
            if(functionCall.methodName == "nft_transfer_payout") {
              transfer.is_marketSale = "true";
              assign_royalties(outcome.status.toValue().toString(),
               receipt.id.toBase58(),
               tokenId,
               old_owner_id.toString(),
               new_owner_id.toString(),
               receipt.signerId,
               receipt.receiverId,
               receipt.predecessorId,
               transfer.timestamp)
            }
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