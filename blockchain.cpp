#include <iostream>
#include <vector>
#include <string>
#include <ctime>
#include <sstream>
#include <functional> // For std::hash
#include <fstream>    // For file operations

// Block class definition
class Block {
public:
    int index;
    std::string previousHash;
    std::string data;
    std::string timestamp;
    std::string hash;

    // Constructor
    Block(int idx, const std::string& prevHash, const std::string& blockData)
        : index(idx), previousHash(prevHash), data(blockData) {
        timestamp = getCurrentTime();
        hash = calculateHash();
    }

    // Function to calculate the block's hash using std::hash
    std::string calculateHash() const {
        std::stringstream ss;
        ss << index << previousHash << timestamp << data;
        return std::to_string(std::hash<std::string>{}(ss.str()));
    }

private:
    // Function to get the current time in string format
    std::string getCurrentTime() const {
        std::time_t currentTime = std::time(nullptr);
        return std::asctime(std::localtime(&currentTime));
    }
};

// Blockchain class definition
class Blockchain {
public:
    Blockchain() {
        // Load existing blocks from file or create the genesis block
        loadBlocksFromFile();
        if (chain.empty()) {
            // If no blocks exist, create the genesis block
            chain.push_back(createGenesisBlock());
            // Save the genesis block to file
            saveBlockToFile(chain.back());
        }
    }

    // Function to add a new block to the blockchain
    void addBlock(const std::string& data) {
        Block newBlock(chain.size(), chain.back().hash, data);
        chain.push_back(newBlock);
        saveBlockToFile(newBlock); // Save new block to file
    }

    // Function to print the entire blockchain
    void printBlockchain() const {
        for (const Block& block : chain) {
            std::cout << "Block " << block.index << ":\n";
            std::cout << "    Previous Hash: " << block.previousHash << "\n";
            std::cout << "    Data: " << block.data << "\n";
            std::cout << "    Timestamp: " << block.timestamp;
            std::cout << "    Hash: " << block.hash << "\n\n";
        }
    }

private:
    std::vector<Block> chain;

    // Function to create the genesis block
    Block createGenesisBlock() const {
        return Block(0, "0", "Genesis Block");
    }

    // Function to load blocks from blocks.txt
    void loadBlocksFromFile() {
        std::ifstream inputFile("blocks.txt");
        if (!inputFile) {
            std::cerr << "Error opening blocks.txt for reading." << std::endl;
            return;
        }

        std::string line;
        while (std::getline(inputFile, line)) {
            if (line.find("Block") != std::string::npos) {
                int index;
                std::string previousHash, data, timestamp, hash;

                // Parse block information
                std::getline(inputFile, line);
                previousHash = line.substr(line.find(": ") + 2); // Get previous hash
                std::getline(inputFile, line);
                data = line.substr(line.find(": ") + 2);         // Get data
                std::getline(inputFile, line);
                timestamp = line.substr(line.find(": ") + 2);    // Get timestamp
                std::getline(inputFile, line);
                hash = line.substr(line.find(": ") + 2);         // Get hash

                // Create block and add to the chain
                Block block(chain.size(), previousHash, data);
                block.timestamp = timestamp; // Set timestamp
                block.hash = hash;           // Set hash
                chain.push_back(block);
            }
        }

        inputFile.close();
    }

    // Function to save a block's information to blocks.txt
    void saveBlockToFile(const Block& block) {
        std::ofstream outputFile("blocks.txt", std::ios::app); // Open in append mode
        if (outputFile) {
            outputFile << "Block " << block.index << ":\n";
            outputFile << "    Previous Hash: " << block.previousHash << "\n";
            outputFile << "    Data: " << block.data << "\n";
            outputFile << "    Timestamp: " << block.timestamp;
            outputFile << "    Hash: " << block.hash << "\n\n";
            outputFile.close();
        } else {
            std::cerr << "Error opening blocks.txt for writing." << std::endl;
        }
    }
};

int main(int argc, char* argv[]) {
    Blockchain votingBlockchain;

    if (argc > 1) {
        // If vote data is passed as a command-line argument, add a block
        std::string voteData = argv[1];
        votingBlockchain.addBlock(voteData);

        std::cout << "New block added with vote data: " << voteData << "\n\n";
    } else {
        std::cerr << "Error: No vote data provided!\n";
        return 1;
    }

    // Optionally, print the blockchain (for debugging purposes)
    votingBlockchain.printBlockchain();

    return 0;
}
