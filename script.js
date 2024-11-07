//------------------------------------------ variable defining -------------------------------------------------------------

let blockchain = []; // Array to hold the blockchain
let blockchainUsr = [];
let peer = null;
let connections = []; // Array to hold all peer connections
let reservePool = []; // Array to hold votes in the reserve pool
let resultant_vote = [];

/*********************************************initialisation**************************************************************/

function initializePeer() {
  peer = new Peer({
    host: "localhost",
    port: 3000,
    path: "/peerjs",
  });

  peer.on("open", (id) => {
    const peerIdElement = document.getElementById("peer-id");
    if (peerIdElement) {
      peerIdElement.textContent = "Your Peer ID: ${id}";
    }
    console.log("Your Peer ID:", id);
    sessionStorage.setItem("authorityPeerId", id);

    if (window.location.pathname.includes("authority")) {
      const authorityPeerIdElement =
        document.getElementById("authority-peer-id");
      if (authorityPeerIdElement) {
        authorityPeerIdElement.textContent = id;
      }
    } else {
      fetch("/get-authority")
        .then((response) => response.json())
        .then((data) => {
          const authorityIdElement = document.getElementById("authority-id");
          if (data.authorityID && authorityIdElement) {
            authorityIdElement.textContent = data.authorityID;
            console.log(`authority id : ${data.authorityID}`);
          }
        });
    }
  });

  peer.on("connection", (connection) => {
    connections.push(connection);
    console.log("Incoming peer connection:", connection.peer);

    connection.send({ type: "authorityId", id: connection.peer });
    broadcastBlockchain();
    // handleConnection(connection);

    connection.on("data", (data) => {
      if (data.type === "vote") {
        console.log("Vote received from user:", data.data);
        resultant_vote.push(data.data);

        reservePool.push(data.data);
        let result_box = resultant_vote.length;

        updateReservePoolDisplay();
        updateVoteCount(data.data.candidate, result_box);
        // Update vote count in result.html

        // Here you can handle the received vote data as needed

        if (reservePool.length >= 4) {
          createBlockFromReservePool(); // Create a block if enough votes are present
        }
      }

      if (data.type === "syncs_blockchain") {
        console.log("Blockchain sync requested by:", connection.peer);

        // Send the current blockchain data to the requesting peer
        connection.send({
          type: "blockchainUpdate",
          blockchain: JSON.parse(JSON.stringify(blockchain)), // Send a copy of the blockchain
        });
        console.log(`Blockchain broadcasted to peer ${connection.peer}`);
      }
    });
  });
}

/********************************************* functions ****************************************************************/

////  getmerkleproof 

//-------------------------------------------------------------------------------------------------------------------------------

function broadcastBlockchain() {
  connections.forEach((connection) => {
    connection.send({
      type: "blockchainUpdate",
      blockchain: JSON.parse(JSON.stringify(blockchain)), // Send a copy of the blockchain
    });
    console.log(`Blockchain broadcasted to peer ${connection.peer}`);
  });
}

//----------------------------------------------------------------------------------------------------------------------------------

// Function to send unique messages containing hashed votes to each user
function sendUniqueMessageToEachPeer(hashedVotes) {
  let array = [];
  hashedVotes.forEach(({ peerId, hash }) => {
    // Find the connection associated with this peerId
    const userConnection = connections.find((conn) => conn.peer === peerId);

    if (userConnection) {
      array = [hash, blockchain.length];
      // Send a unique message to this peer with their hashed vote
      userConnection.send({
        type: "uniqueVoteMessage",
        message: `Thank you for voting! Your vote has been recorded. Hash: ${hash} and Block Number : ${blockchain.length}`,
        values: array,
      });
      console.log(
        `Sent message to peer ${peerId}: Thank you for voting. Hash: ${hash}`
      );
      array = [];
    } else {
      console.log(`No connection found for peer ${peerId}`);
    }
  });
}

//-------------------------------------------------------------------------------------------------------------------------------

function updateVoteCount(candidate, result_box) {
  const voteCountElement = document.getElementById(`votes${candidate}`);
  const totalVotes = document.getElementById("totalVotes");
  if (totalVotes) {
    totalVotes.textContent = result_box;
  }
  if (voteCountElement) {
    let currentVotes = parseInt(voteCountElement.innerText.split(": ")[1]);
    voteCountElement.innerText = `Votes: ${currentVotes + 1}`;
  }
}

//---------------------------------------------------------------------------------------------------------------------------------

function updateReservePoolDisplay() {
  const reservePoolDisplay = document.getElementById("reserve-pool-display");
  reservePoolDisplay.value = JSON.stringify(reservePool, null, 2); // Display reserve pool in a formatted JSON style
}

//---------------------------------------------------------------------------------------------------------------------------------

function updateBlockchainDisplay() {
  const blockchainDisplayAuth = document.getElementById(
    "blockchain-display-authority"
  );
  blockchainDisplayAuth.value = JSON.stringify(blockchain, null, 2); // Display blockchain in formatted JSON
}

//--------------------------------------------------------------------------------------------------------------------------------

function updateBlockchainDisplayUsr(blockchainUsr) {
  const blockchainDisplayUser = document.getElementById("blockchain-display");
  blockchainDisplayUser.value = JSON.stringify(blockchainUsr, null, 2); // Display blockchain in formatted JSON
}

//--------------------------------------------------------------------------------------------------------------------------------

function generateUniqueHex(input) {
  const timestamp = Date.now().toString(16); // Get the current timestamp in hex
  const randomNumber = Math.floor(Math.random() * 1000000000000000) + 1;
  let randomString = randomNumber.toString();
  const combined = input + timestamp + randomString; // Combine input and timestamp

  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  let hex = (hash >>> 0).toString(16); // Convert hash to hex
  while (hex.length < 16) {
    hex = "0" + hex; // Pad with zeros
  }
  return hex.slice(-16); // Ensure it's 16 characters long
}

//-------------------------------------------------------------------------------------------------------------------------------

function sumHex(hex1, hex2) {
  const num1 = parseInt(hex1, 16); // Convert first hex string to number
  const num2 = parseInt(hex2, 16); // Convert second hex string to number
  const sum = num1 + num2; // Calculate the sum of the two numbers
  return sum.toString(16).padStart(16, "0"); // Convert sum back to hex and ensure it's 16 characters long
}

//------------------------------------------------------------------------------------------------------------------------------

//block hash;
async function generateBlockHash(merkleRoot, timestamp) {
  const data = merkleRoot + timestamp; // Concatenate values to hash
  const encoder = new TextEncoder(); // Create a new TextEncoder
  const dataBuffer = encoder.encode(data); // Encode the data as a Uint8Array

  // Use SubtleCrypto to hash the data
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);

  // Convert the hashBuffer to a hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const blockHash = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return blockHash; // Return the hexadecimal hash string
}

//----------------------------------------------------------------------------------------------------------------------------

function checkForVoteData() {
  const voting_Hash = document.getElementById("vote_Hash").textContent;
  const block_number = document.getElementById("block_Num").textContent;

  if (voting_Hash && block_number) {
    console.log(
      "Vote submitted with hash:",
      voting_Hash,
      "and block number:",
      block_number
    );
    window.location.href = `/after_vote?voting_Hash=${voting_Hash}&block_number=${block_number}`;
  } else {
    // If data is not yet available, check again after a short delay
    setTimeout(checkForVoteData, 1000); // Check every 500 milliseconds
  }
}

//-----------------------------------------------------------------------------------------------------------------------------

// Function to create a block from the reserve pool
async function createBlockFromReservePool() {
  if (reservePool.length < 4) return; // Ensure there are enough votes

  // Hashing function
  const hashData = (data) => {
    return generateUniqueHex(data); // Use the new unique hex generation function
  };

  // Hashing votes
  const hashedVotes = reservePool.map((vote) => ({
    peerId: vote.peerId, // Store the peerId along with the hashed vote
    hash: hashData(JSON.stringify(vote)),
  }));

  // Combine hashes for Merkle tree
  const combinedHashes = [
    sumHex(hashedVotes[0].hash, hashedVotes[1].hash),
    sumHex(hashedVotes[2].hash, hashedVotes[3].hash),
  ];

  //merkle root
  const merkleRoot = sumHex(combinedHashes[0], combinedHashes[1]);

  // Create block data
  const timestamp = Date.now();

  const blockHash = await generateBlockHash(merkleRoot, timestamp);

  // Previous hash (can be the last block's hash if applicable)
  const prevHash = blockchain.length
    ? blockchain[blockchain.length - 1].header.hash
    : "0";
  const blockNumber = blockchain.length ? blockchain.length + 1 : 1;

  const blockData = {
    header: {
      blockNumber: blockNumber,
      merkleRoot: merkleRoot,
      hash: blockHash, // Block hash
      prevHash: prevHash,
      timestamp: timestamp,
    },
    data: {
      votes: hashedVotes.map((vote) => vote.hash),
      merkleTree: [
        { hashes: [merkleRoot] }, // Layer containing the merkle root
        { hashes: combinedHashes }, // Layer of combined hashes
        { hashes: hashedVotes.map((vote) => vote.hash) }, // Original hashes
      ],
    },
  };

  // Add block to blockchain
  blockchain.push(blockData);
  console.log("New block created:", blockData); // Log the created block data

  updateBlockchainDisplay(); // Update the display to show the new block

  //to update user
  sendUniqueMessageToEachPeer(hashedVotes);
  broadcastBlockchain();

  // Clear the reserve pool for new votes
  reservePool = [];
  updateReservePoolDisplay(); // Update display to show cleared reserve pool
}


/****************************************** ending vote function *************************************************************/

// Function to create a block from the reserve pool
async function createBlockFromReservePool_lessThanFour() {
  if(reservePool.length === 3){
    // Hashing function
  const hashData = (data) => {
    return generateUniqueHex(data); // Use the new unique hex generation function
  };

  // Hashing votes
  const hashedVotes = reservePool.map((vote) => ({
    peerId: vote.peerId, // Store the peerId along with the hashed vote
    hash: hashData(JSON.stringify(vote)),
  }));

  // Combine hashes for Merkle tree
  const combinedHashes = [
    sumHex(hashedVotes[0].hash, hashedVotes[1].hash),
    sumHex(hashedVotes[2].hash, hashedVotes[2].hash),
  ];

  //merkle root
  const merkleRoot = sumHex(combinedHashes[0], combinedHashes[1]);

  // Create block data
  const timestamp = Date.now();

  const blockHash = await generateBlockHash(merkleRoot, timestamp);

  // Previous hash (can be the last block's hash if applicable)
  const prevHash = blockchain.length
    ? blockchain[blockchain.length - 1].header.hash
    : "0";
  const blockNumber = blockchain.length ? blockchain.length + 1 : 1;

  const blockData = {
    header: {
      blockNumber: blockNumber,
      merkleRoot: merkleRoot,
      hash: blockHash, // Block hash
      prevHash: prevHash,
      timestamp: timestamp,
    },
    data: {
      votes: hashedVotes.map((vote) => vote.hash),
      merkleTree: [
        { hashes: [merkleRoot] }, // Layer containing the merkle root
        { hashes: combinedHashes }, // Layer of combined hashes
        { hashes: [...hashedVotes.map((vote) => vote.hash), hashedVotes[hashedVotes.length - 1].hash] }, // Duplicate last vote hash
      ],
    },
  };

  // Add block to blockchain
  blockchain.push(blockData);
  console.log("New block created:", blockData); // Log the created block data

  updateBlockchainDisplay(); // Update the display to show the new block

  //to update user
  sendUniqueMessageToEachPeer(hashedVotes);
  broadcastBlockchain();

  // Clear the reserve pool for new votes
  reservePool = [];
  updateReservePoolDisplay(); // Update display to show cleared reserve pool
  }


  else if(reservePool.length === 2){
  // Hashing function
  const hashData = (data) => {
    return generateUniqueHex(data); // Use the new unique hex generation function
  };

  // Hashing votes
  const hashedVotes = reservePool.map((vote) => ({
    peerId: vote.peerId, // Store the peerId along with the hashed vote
    hash: hashData(JSON.stringify(vote)),
  }));

  //merkle root
  const merkleRoot = sumHex(hashedVotes[0].hash, hashedVotes[1].hash);

  // Create block data
  const timestamp = Date.now();

  const blockHash = await generateBlockHash(merkleRoot, timestamp);

  // Previous hash (can be the last block's hash if applicable)
  const prevHash = blockchain.length
    ? blockchain[blockchain.length - 1].header.hash
    : "0";
  const blockNumber = blockchain.length ? blockchain.length + 1 : 1;

  const blockData = {
    header: {
      blockNumber: blockNumber,
      merkleRoot: merkleRoot,
      hash: blockHash, // Block hash
      prevHash: prevHash,
      timestamp: timestamp,
    },
    data: {
      votes: hashedVotes.map((vote) => vote.hash),
      merkleTree: [
        { hashes: [merkleRoot] }, // Layer containing the merkle root
        { hashes: hashedVotes.map((vote) => vote.hash) }, // Original hashes
      ],
    },
  };

  // Add block to blockchain
  blockchain.push(blockData);
  console.log("New block created:", blockData); // Log the created block data

  updateBlockchainDisplay(); // Update the display to show the new block

  //to update user
  sendUniqueMessageToEachPeer(hashedVotes);
  broadcastBlockchain();

  // Clear the reserve pool for new votes
  reservePool = [];
  updateReservePoolDisplay(); // Update display to show cleared reserve pool
  }


  else if(reservePool.length === 1){
    // Hashing function
  const hashData = (data) => {
    return generateUniqueHex(data); // Use the new unique hex generation function
  };

  // Hashing votes
  const hashedVotes = reservePool.map((vote) => ({
    peerId: vote.peerId, // Store the peerId along with the hashed vote
    hash: hashData(JSON.stringify(vote)),
  }));

  //merkle root
  const merkleRoot = sumHex(hashedVotes[0].hash, hashedVotes[0].hash);

  // Create block data
  const timestamp = Date.now();

  const blockHash = await generateBlockHash(merkleRoot, timestamp);

  // Previous hash (can be the last block's hash if applicable)
  const prevHash = blockchain.length
    ? blockchain[blockchain.length - 1].header.hash
    : "0";
  const blockNumber = blockchain.length ? blockchain.length + 1 : 1;

  const blockData = {
    header: {
      blockNumber: blockNumber,
      merkleRoot: merkleRoot,
      hash: blockHash, // Block hash
      prevHash: prevHash,
      timestamp: timestamp,
    },
    data: {
      votes: hashedVotes.map((vote) => vote.hash),
      merkleTree: [
        { hashes: [merkleRoot] }, // Layer containing the merkle root
        { hashes: hashedVotes.map((vote) => [vote.hash, vote.hash]).flat()}, // Original hashes
      ],
    },
  };

  // Add block to blockchain
  blockchain.push(blockData);
  console.log("New block created:", blockData); // Log the created block data

  updateBlockchainDisplay(); // Update the display to show the new block

  //to update user
  sendUniqueMessageToEachPeer(hashedVotes);
  broadcastBlockchain();

  // Clear the reserve pool for new votes
  reservePool = [];
  updateReservePoolDisplay(); // Update display to show cleared reserve pool
  }

  else{
    console.log("NO  Votes in resever pool ");
  }
}


/******************************************connection with authority*************************************************************/
//------------------------------------------------by Dashboard-------------------------------------------------------

const connect_authority = document.getElementById("connect-authority");
if (connect_authority) {
  connect_authority.onclick = function () {
    const peerId = document.getElementById("authority-peer-id").value; // Get authority Peer ID
    const conn = peer.connect(peerId); // Connect to authority

    conn.on("open", () => {
      connections.push(conn); // Store connection
      console.log("Connected to authority:", peerId); // Log successful connection

      // Request authority ID from the connected authority peer
      conn.send({ type: "syncs_blockchain" });
    });

    // Handle incoming data from authority
    conn.on("data", (data) => {
      if (data.type === "authorityId") {
        console.log("Authority ID received:", data.id); // Log received authority ID
      }
      if (data.type === "blockchainUpdate") {
        console.log("Received blockchain update");

        // Replace blockchain only if the received blockchain is longer
        if (data.blockchain.length > blockchainUsr.length) {
          blockchainUsr = JSON.parse(JSON.stringify(data.blockchain)); // Update with the new blockchain
          if (window.location.pathname != "/vote") {
            updateBlockchainDisplayUsr(blockchainUsr);
          }
          console.log("Blockchain updated with new data ");
        }
      }
    });

    conn.on("error", (err) => {
      console.error("Connection error:", err); // Log any connection errors
    });
  };
}

//----------------------------------------- by voting page----------------------------------------------------------

const connect_authority_voting = document.getElementById(
  "connect-authority-voting"
);
if (connect_authority_voting) {
  connect_authority_voting.onclick = function () {
    const peerId = document.getElementById("authority-peer-id").value; // Get authority Peer ID
    const conn = peer.connect(peerId); // Connect to authority

    conn.on("open", () => {
      connections.push(conn); // Store connection
      console.log("Connected to authority:", peerId); // Log successful connection

      // Request authority ID from the connected authority peer
      conn.send({ type: "requestAuthorityId" });
    });

    // Handle incoming data from authority
    conn.on("data", (data) => {
      if (data.type === "authorityId") {
        console.log("Authority ID received:", data.id); // Log received authority ID
      }

      if (data.type === "uniqueVoteMessage") {
        console.log("Unique vote message:", data.message); // Handle unique message from authority

        if (data.values && Array.isArray(data.values)) {
          const [hash, blockNumber] = data.values; // Destructure to get hash and block number
          document.getElementById("vote_Hash").textContent = hash;
          document.getElementById("block_Num").textContent = blockNumber;
          checkForVoteData();
        } else {
          console.log("No additional values found in uniqueVoteMessage");
        }
      }
    });

    conn.on("error", (err) => {
      console.error("Connection error:", err); // Log any connection errors
    });
  };
}

/*****************************************************voting logic********************************************************/

// Handle form submission for voting
const vote_form = document.getElementById("vote-form");
if (vote_form) {
  vote_form.onsubmit = function (event) {
    event.preventDefault(); // Prevent default form submission

    const selectedCandidate = document.querySelector(
      'input[name="candidate"]:checked'
    ); // Get selected candidate
    const voteConfirmation = document.getElementById("voteConfirmation").value; // Get vote confirmation

    // Check if a candidate is selected and the vote is confirmed
    if (selectedCandidate && voteConfirmation.trim().toLowerCase() === "vote") {
      const voteData = {
        candidate: selectedCandidate.value, // Store selected candidate
        peerId: peer.id, //peer id
      };

      const authorityConnection = connections[0]; // Get the first connection (authority)
      if (authorityConnection) {
        authorityConnection.send({ type: "vote", data: voteData }); // Send vote data to authority
        console.log("Vote sent to authority:", voteData); // Log vote sent

        // Show success message
        document.getElementById("successMessage").style.display = "block";
        document.getElementById("votingOptions").style.display = "none"; // Hide voting options

        checkForVoteData();
      } else {
        console.log("No authority connection available."); // Log if no connection
      }
    } else {
      alert(
        'Please select a candidate and confirm your vote by typing "vote".'
      ); // Alert if validation fails
    }
  };
}

/*************************************************** DOM *********************************************************/

// DOM Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  initializePeer();

  // Manually send authority ID to the server
  const sendPeerIdBtn = document.getElementById("send-peer-id");
  if (sendPeerIdBtn) {
    sendPeerIdBtn.addEventListener("click", () => {
      const authorityPeerId = sessionStorage.getItem("authorityPeerId");
      if (authorityPeerId) {
        // Send authority ID to server
        fetch(`/set-authority?id=${authorityPeerId}`).then(() => {
          // Fetch and display the updated authority ID
          fetch("/get-authority")
            .then((response) => response.json())
            .then((data) => {
              const authorityIdElement =
                document.getElementById("authority-id");
              if (data.authorityID && authorityIdElement) {
                authorityIdElement.textContent = data.authorityID;
                console.log(`Authority ID updated to: ${data.authorityID}`);
              }
            });
        });
      }
    });
  }

  const endVote = document.getElementById('end_of_voting');
  if (endVote) {
    endVote.addEventListener("click", () => {
      // Collect voting data
      const votingData = {
        totalVotes: parseInt(document.getElementById("totalVotes").textContent) || 0,
        candidates: {
          candidateA: parseInt(document.getElementById("votesCandidateA").textContent.replace('Votes: ', '')) || 0,
          candidateB: parseInt(document.getElementById("votesCandidateB").textContent.replace('Votes: ', '')) || 0,
          candidateC: parseInt(document.getElementById("votesCandidateC").textContent.replace('Votes: ', '')) || 0
        }
      };
  
      // Send voting data to the server
      fetch("/end-voting", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(votingData)
      })
      .then(response => response.json())
      .then(data => {
        alert(data.message);
        console.log("Voting ended successfully.");
        createBlockFromReservePool_lessThanFour();
      })
      .catch(error => console.error("Error:", error));
  
      console.log("Voting is ending");
    });
  }

  const verify_button = document.getElementById("get-hashes-button-dash");
  if (verify_button) {
    verify_button.addEventListener("click", () => {
      const blockNumber = parseInt(
        document.getElementById("block-number-input").value
      );
      console.log("block no hai yr : " + blockNumber);
      const voteHash = document.getElementById("vote-hash-input").value.trim(); // Get the vote hash input

      if (!isNaN(blockNumber) && voteHash) {
        // Check if both inputs are valid
        getCombinedHashes(voteHash, blockNumber); // Pass both inputs to the function
      } else {
        console.log("Please enter a valid vote hash and block number.");
      }
    });

    function getCombinedHashes(voteHash, blockNumber) {
      // Call the getMerkleProof function with the provided vote hash and block number

      console.log("block no hai yr : " + blockNumber);
      getMerkleProof(voteHash, blockNumber);
    }
  }

  const showReservePoolBtn = document.getElementById("show-reserve-pool");
  if (showReservePoolBtn) {
    showReservePoolBtn.addEventListener("click", () => {
      const reservePoolSection = document.getElementById(
        "reserve-pool-section"
      );
      reservePoolSection.style.display =
        reservePoolSection.style.display === "none" ? "block" : "none"; // Toggle display
    });
  }

  const showBlockchainBtn = document.getElementById("show-blockchain");
  if (showBlockchainBtn) {
    showBlockchainBtn.addEventListener("click", () => {
      const blockchainSection = document.getElementById("blockchain-section");
      blockchainSection.style.display =
        blockchainSection.style.display === "none" ? "block" : "none"; // Toggle display
    });
  }
});

//-------------------------------------------------- 😜end of code😜 ----------------------------------------------------//
