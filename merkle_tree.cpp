#include <iostream>
#include <vector>
#include <string>
#include <functional>
#include <sstream>
#include <iomanip>
#include <algorithm> // Include this for std::find

class MerkleTree {
public:
    MerkleTree() : root("") {}

    // Function to add a vote
    void addVote(const std::string& vote) {
        votes.push_back(vote);
        std::cout << "Adding vote: " << vote << std::endl;
        rebuildTree();
        std::cout << "Current Merkle Root after adding vote: " << root << std::endl;
    }

    // Function to remove a vote
    void removeVote(const std::string& vote) {
        auto it = std::find(votes.begin(), votes.end(), vote);
        if (it != votes.end()) {
            votes.erase(it);
            std::cout << "Removing vote: " << vote << std::endl;
            rebuildTree();
        } else {
            std::cout << "Vote not found: " << vote << std::endl;
        }
    }

    // Function to get the current Merkle root
    std::string getRoot() const {
        return root;
    }

    // Function to print the votes
    void printVotes() const {
        std::cout << "Votes: ";
        for (const auto& vote : votes) {
            std::cout << vote << " ";
        }
        std::cout << std::endl;
    }

private:
    std::vector<std::string> votes; // Store votes
    std::string root;               // Current Merkle root

    // Function to rebuild the Merkle Tree
    void rebuildTree() {
        std::vector<std::string> currentLevel = votes;

        std::cout << "Building Merkle Tree..." << std::endl;

        // If there is only one vote, hash it and set as root
        if (currentLevel.size() == 1) {
            root = hash(currentLevel.front()); // Set root to the hash of the only vote
            std::cout << "Only one vote present. Merkle Root is now: " << root << std::endl;
            return;
        }

        while (currentLevel.size() > 1) {
            std::cout << "Current Level: ";
            for (const auto& node : currentLevel) {
                std::cout << node << " ";
            }
            std::cout << std::endl;

            // If the number of blocks is odd, carry the last one forward
            if (currentLevel.size() % 2 != 0) {
                std::cout << "Carrying forward block: " << currentLevel.back() << std::endl;
                currentLevel.push_back(currentLevel.back()); // Duplicate the last block
            }

            std::vector<std::string> nextLevel;
            for (size_t i = 0; i < currentLevel.size(); i += 2) {
                std::string combinedHash = hash(currentLevel[i] + currentLevel[i + 1]);
                nextLevel.push_back(combinedHash);
                // Fixed output line
                std::cout << "Hashing blocks: " << currentLevel[i] << " + " 
                          << currentLevel[i + 1] << " -> " << combinedHash << std::endl;
            }
            currentLevel = nextLevel; // Move to the next level
        }

        root = currentLevel.empty() ? "" : currentLevel.front();
        std::cout << "Merkle Root: " << root << std::endl;
    }

    // Simple hash function
    std::string hash(const std::string& data) {
        std::hash<std::string> hasher;
        return toHex(hasher(data)); // Convert hash to hexadecimal
    }

    // Convert size_t hash to hexadecimal string
    std::string toHex(size_t hashValue) {
        std::stringstream ss;
        ss << std::hex << hashValue; // Convert to hexadecimal
        return ss.str();
    }
};

int main() {
    MerkleTree votingTree;

    std::string userInput;

    // Loop to continuously ask for votes
    do {
        std::string vote;
        std::cout << "Enter data for vote (or type 'exit' to stop): ";
        std::getline(std::cin, vote);

        if (vote == "exit") {
            break; // Exit the loop if user types 'exit'
        }

        votingTree.addVote(vote);
    } while (true);

    // Print the current votes
    votingTree.printVotes();

    // Display the final Merkle Root
    std::cout << "Final Merkle Root: " << votingTree.getRoot() << std::endl;

    return 0;
}
