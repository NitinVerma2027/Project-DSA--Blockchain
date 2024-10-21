#include <iostream>
#include <vector>
#include <string>
#include <functional>
#include <sstream>
#include <iomanip>
#include <algorithm>

using namespace std;

class MerkleTree {
public:
    MerkleTree() : root("") {}

    // Function to add a vote
    void addVote(const string& vote) {
        votes.push_back(vote);
        cout << "Adding vote: " << vote << endl;
        rebuildTree();
        cout << "Current Merkle Root after adding vote: " << root << endl;
    }

    // Function to remove a vote
    void removeVote(const string& vote) {
        auto it = find(votes.begin(), votes.end(), vote);
        if (it != votes.end()) {
            votes.erase(it);
            cout << "Removing vote: " << vote << endl;
            rebuildTree();
        } else {
            cout << "Vote not found: " << vote << endl;
        }
    }

    // Function to get the current Merkle root
    string getRoot() const {
        return root;
    }

    // Function to print the votes
    void printVotes() const {
        cout << "Votes: ";
        for (const auto& vote : votes) {
            cout << vote << " ";
        }
        cout << endl;
    }

private:
    vector<string> votes; // Store votes
    string root;         // Current Merkle root

    // Function to rebuild the Merkle Tree
    void rebuildTree() {
        vector<string> currentLevel = votes;

        cout << "Building Merkle Tree..." << endl;

        // If there is only one vote, hash it and set as root
        if (currentLevel.size() == 1) {
            root = hash(currentLevel.front()); // Set root to the hash of the only vote
            cout << "Only one vote present. Merkle Root is now: " << root << endl;
            return;
        }

        while (currentLevel.size() > 1) {
            cout << "Current Level: ";
            for (const auto& node : currentLevel) {
                cout << node << " ";
            }
            cout << endl;

            // If the number of blocks is odd, carry the last one forward
            if (currentLevel.size() % 2 != 0) {
                cout << "Carrying forward block: " << currentLevel.back() << endl;
                currentLevel.push_back(currentLevel.back()); // Duplicate the last block
            }

            vector<string> nextLevel;
            for (size_t i = 0; i < currentLevel.size(); i += 2) {
                string combinedHash = hash(currentLevel[i] + currentLevel[i + 1]);
                nextLevel.push_back(combinedHash);
                // Fixed output line
                cout << "Hashing blocks: " << currentLevel[i] << " + " 
                     << currentLevel[i + 1] << " -> " << combinedHash << endl;
            }
            currentLevel = nextLevel; // Move to the next level
        }

        root = currentLevel.empty() ? "" : currentLevel.front();
        cout << "Merkle Root: " << root << endl;
    }

    // Simple hash function
    string hash(const string& data) {
        std::hash<string> hasher; // Corrected line
        return toHex(hasher(data)); // Convert hash to hexadecimal
    }

    // Convert size_t hash to hexadecimal string
    string toHex(size_t hashValue) {
        stringstream ss;
        ss << hex << hashValue; // Convert to hexadecimal
        return ss.str();
    }
};

int main() {
    MerkleTree votingTree;

    string userInput;

    // Loop to continuously ask for votes
    do {
        string vote;
        cout << "Enter data for vote (or type 'exit' to stop): ";
        getline(cin, vote);

        if (vote == "exit") {
            break; // Exit the loop if user types 'exit'
        }

        votingTree.addVote(vote);
    } while (true);

    // Print the current votes
    votingTree.printVotes();

    // Display the final Merkle Root
    cout << "Final Merkle Root: " << votingTree.getRoot() << endl;

    return 0;
}
