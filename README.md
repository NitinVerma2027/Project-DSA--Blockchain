# Project-DSA--Blockchain
Creating A DSA Project for our Data structures and Algorithms course based on blockchain technology.

Our decentralized voting system is designed to uphold transparency and security throughout the entire voting process. By leveraging blockchain technology, each vote is securely recorded and verified, ensuring that all data remains immutable and accessible for public verification. The system assigns unique Peer IDs to both the authority and participants, creating a peer-to-peer network that prevents any form of manipulation or tampering with the votes. Furthermore, the use of Merkle trees, along with public access to blockchain data and the reserve pool, allows for real-time monitoring and auditing of the voting process, guaranteeing the integrity and openness of the election.



1. Voting System Overview:
You are working on a decentralized voting system using a blockchain-like structure, where the authority page interacts with various elements of the blockchain. The system involves:

Peer-to-Peer Communication: The authority generates and sends its Peer ID to the server, facilitating communication with voters.
Blockchain & Reserve Pool: The authority can view the blockchain data and reserve pool, where votes are temporarily stored before they are added to the blockchain.
Voting Results: The authority monitors the vote count for each candidate and can send results to the server when voting ends.
Merkle Tree Interaction: The authority can retrieve the Merkle proof for votes and blocks, likely for verification purposes in the blockchain system.

2. Key Files Involved:
Authority Page (miner page - HTML): The user interface for the authority to manage peer IDs, voting results, and blockchain interaction.

Peer ID Generation: Displays and allows the authority to send the Peer ID to the server.
Blockchain Interaction: Displays the current blockchain data and reserve pool.
Voting Results: Displays the votes for each candidate and provides an interface to end the voting and send results to the server.
Hashing Interaction: Allows input of vote hashes and block numbers to get combined hashes, potentially interacting with the Merkle tree.
Server-side Data Handling:

Blockchain Data: The backend is responsible for handling blockchain-like data, storing votes, and processing vote counts.
End of Voting: A route (/end-voting) is set up to handle the end-of-voting action and send the results to the server.
Voting and Results Handling:

Candidates: Three candidates are part of the voting system (A, B, C), with the total number of votes displayed for each.
Vote Hashes: Votes are linked to hashes and blocks, and Merkle tree proofs are involved in verifying the integrity of the vote data.
Code Sections in the HTML File:

Peer ID Confirmation: Displays and confirms that the Peer ID has been successfully sent to the server.
Voting Results Section: Shows real-time vote counts for each candidate.
Block and Pool Data: Provides visibility into the current state of the blockchain and the reserve pool of votes.
Hashing: Allows for the combination of vote hashes and block numbers to retrieve Merkle tree proofs.

3. Key JavaScript Functions:
Peer ID Handling:
send-peer-id: Sends the generated Peer ID to the server, confirming the action with a message.
Combined Hashes Retrieval:
getCombinedHashes: This function handles input of the vote hash and block number, passing them to getMerkleProof for processing.
End Voting Process:
The "END VOTING" button sends a POST request to the server, delivering the voting data (total votes and votes for each candidate).
The results are sent as a JSON object, which is expected to be processed and stored by the server.

4. Voting System Workflow:
Authority Generation of Peer ID: The authority generates their Peer ID, which is displayed on the page and sent to the server.
Blockchain Interaction: The authority can view and manage the blockchain data and reserve pool, allowing them to oversee the voting process.
Voting Process: Voters connect via their peer IDs and vote for their candidates. The authority monitors the real-time vote count.
Merkle Tree Proofs: The authority can input vote hashes and block numbers to verify votes using Merkle tree proofs.
Ending Voting: When voting ends, the results (vote counts) are sent to the server, and the authority can use the /end-voting endpoint to finalize the process.

Integration with Other Pages:
The Authority Page interacts with other components of the system, particularly the Voting Pages (such as user registration, peer ID generation, and vote submission) by ensuring that the authority is notified and able to validate votes as they are cast and stored.


