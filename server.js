//--------------------------------------------------------------Variable define -------------------------------------------------------------------------

const express = require("express");
const fs = require("fs");
const path = require("path");
const { ExpressPeerServer } = require("peer");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");

const app = express();

const dataFilePath = path.join(__dirname, "data.json");
let authorityID = null;

let votingStatus = "ongoing";

//-------------------------------------------------------------- API -------------------------------------------------------------------------

//enable cors
app.use(cors());
// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public")); // Serve static files from the public directory
app.use(
  session({
    secret: "securevotingsecret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      name: "sessionId_" + Math.random().toString(36).substring(2, 15), // Random string as part of the cookie name
    },
  })
);

//-------------------------------------------------------------- file read/write -------------------------------------------------------------------------

// Utility functions to read/write JSON file
const readDataFile = () => {
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify({ users: [] }, null, 2));
  }
  const data = fs.readFileSync(dataFilePath, "utf8");
  return JSON.parse(data);
};

const writeDataFile = (data) => {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), "utf8");
};

//-------------------------------------------------------------- getting html -------------------------------------------------------------------------

// Serve HTML files
app.get("/", (req, res) => {
  const message = req.query.message; // Get the message from query parameters

  // Create an HTML response
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Home Page</title>
        <link rel="stylesheet" href="home.css"> 
    </head>
    <body>
        <h1>Welcome to the Voting System</h1>
        <p>Please choose an option below:</p>
        ${
          message ? `<p>${message}</p>` : ""
        } <!-- Display the success message -->

        <a href="/register">
            <button>Register</button>
        </a>

        <a href="/login">
            <button>Login</button>
        </a>
    </body>
    </html>
  `;

  res.send(html); // Send the HTML response
});

//-------------------------------------------------------------- -------------------------------------------------------------------------

app.get("/authority", (req, res) => {
  res.sendFile(path.join(__dirname, "authority.html"));
});

//--------------------------------------------------------------------------------------------------------------------------------------

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "registration.html"));
});

//-------------------------------------------------------------------------------------------------------------------------------------

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

//-------------------------------------------------------------- ------------------------------------------------------------------------

app.get("/vote", (req, res) => {
  if (req.session.userId) {
    res.sendFile(path.join(__dirname, "voting.html"));
  } else {
    res.redirect("/login");
  }
});

//--------------------------------------------------------------------------------------------------------------------------------------

// Route to set the authority ID
app.get("/set-authority", (req, res) => {
  const { id } = req.query;
  authorityID = id;
  res.sendStatus(200);
});

//--------------------------------------------------------------------------------------------------------------------------------------

// Route to get the authority ID
app.get("/get-authority", (req, res) => {
  res.json({ authorityID });
});

//--------------------------------------------------------------------------------------------------------------------------------------
app.get('/result.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'result.html'));
});


//--------------------------------------------------------------------------------------------------------------------------------------
app.get('/votingData.json', (req, res) => {
  // Path to the JSON file
  const filePath = path.join(__dirname, 'votingData.json');
  
  // Check if file exists
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'Voting data not available yet.' });
  }
});

//------------------------------------------------- registration submition --------------------------------------------------------------

// Registration Route
app.post("/submit_registration", (req, res) => {
  const { name, email, voterid, password, confirmpassword } = req.body;
  if (password !== confirmpassword) {
    return res.send(renderRegistrationForm("Passwords do not match!"));
  }

  const data = readDataFile();
  const existingUser = data.users.find((user) => user.voterid === voterid);

  if (existingUser) {
    return res.send(
      renderRegistrationForm(
        "Voter ID already exists. Please try a different one."
      )
    );
  }

  const newUser = { name, email, voterid, password, hasVoted: false };
  data.users.push(newUser);
  writeDataFile(data);

  res.redirect("/?message=Registration successful!");
});

function renderRegistrationForm(errorMessage = "") {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Voter Registration</title>
        <link rel="stylesheet" href="registration.css">
    </head>
    <body>
        <a href="/" class="home-button">Home</a>
        <div class="container">
            <div class="registration-form">
                <h2>Voter Registration</h2>
                ${
                  errorMessage
                    ? `<p class="error-message">${errorMessage}</p>`
                    : ""
                }
                <form id="register-form" action="/submit_registration" method="post">
                    <label for="name">Full Name:</label>
                    <input type="text" id="name" name="name" placeholder="Enter your full name" required>
                    
                    <label for="email">Email:</label>
                    <input type="email" id="email" name="email" placeholder="Enter your email" required>
                    
                    <label for="voterid">Voter ID:</label>
                    <input type="text" id="voterid" name="voterid" placeholder="Enter your Voter ID" required>
                    
                    <label for="password">Password:</label>
                    <input type="password" id="password" name="password" placeholder="Enter your password" required>
                    
                    <label for="confirmpassword">Confirm Password:</label>
                    <input type="password" id="confirmpassword" name="confirmpassword" placeholder="Confirm your password" required>
                  
                  
                    <div class="button-container">
                      <button id="register-submit" type="submit">Register</button>
                    </div>
                  
                </form>
            </div>
        </div>
        <script src="script.js"></script>
    </body>
    </html>
  `;
}

//--------------------------------------------------------- login route ------------------------------------------------------------------

// Login Route
app.post("/login", (req, res) => {
  const { voterid, password } = req.body;
  const data = readDataFile();
  const user = data.users.find(
    (user) => user.voterid === voterid && user.password === password
  );

  if (!user) {
    return res.send(renderLoginForm("Invalid Voter ID or Password."));
  }

  req.session.userId = user.voterid;
  req.session.hasVoted = user.hasVoted;
  res.redirect("/dashboard");
});

// Function to render the login form with an optional error message
function renderLoginForm(errorMessage = "") {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login</title>
        <link rel="stylesheet" href="login.css"> <!-- Link to your CSS file -->
    </head>
    <body>
        <a href="/" class="home-button">Home</a>
        <div class="container">
            <div class="login-form">
                <h2>Login</h2>
                ${
                  errorMessage
                    ? `<p class="error-message">${errorMessage}</p>`
                    : ""
                }
                <form id="login-form" action="/login" method="post">
                    <label for="voterid">Voter ID:</label>
                    <input type="text" id="voterid" name="voterid" placeholder="Enter your Voter ID" required>
                    
                    <label for="password">Password:</label>
                    <input type="password" id="password" name="password" placeholder="Enter your password" required>
                    
                    <button id="login-submit" type="submit">Login</button>
                </form>
                <p>Don't have an account? <a href="/register">Register here</a></p>
            </div>
        </div>
    </body>
    </html>
  `;
}

//------------------------------------------------------- DASHBOARD ------------------------------------------------------------------

app.get("/dashboard", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }

  const data = readDataFile();
  const user = data.users.find((user) => user.voterid === req.session.userId);

  if (!user) {
    return res.redirect("/login");
  }

  fs.readFile("data.json", "utf8", (err, data) => {
    if (err) {
      console.error("Error reading data.json:", err);
      return res.status(500).send("Error loading dashboard.");
    }

    const voteHash = user.vote_Hash;
    const blockNum = user.block_number;

    // Serve the dashboard with conditional rendering based on voting status
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>User Dashboard</title>
        <link rel="stylesheet" href="dashboard.css">
        <script src="https://cdn.jsdelivr.net/npm/peerjs@1.3.1/dist/peerjs.min.js"></script>
    </head>
    <body>
        <div class="container">
            <h2>Welcome, ${user.name}!</h2>
            <div id="votingStatusSection">
              ${
                votingStatus === "ended"
                  ? `
              <p>Voting has ended. Thank you for your interest!</p>
              `
                  : `
              <p>Please cast your vote by clicking the link below:</p>
              <a href="/vote"><button>Go to Voting Page</button></a>
              `
              }
            </div>
            <div id="votedSection" style="${
              user.hasVoted ? "display: block;" : "display: none;"
            }">
                <p>You have already voted. Thank you for participating in the election.</p>
                <p><strong>Vote Hash:</strong> <span id="voteHash">${voteHash}</span></p>
                <p><strong>Block Number:</strong> <span id="blockNum">${blockNum}</span></p>

            </div>
            <div id="notVotedSection" style="${
              user.hasVoted ? "display: none;" : "display: block;"
            }">
            </div>
            <a href="/result.html" target="_blank">
            <button id="viewResultsButton" class="btn">View Voting Results</button>
            </a>
            <a href="/logout"><button>Logout</button></a>

        </div>

        <!-- Conditionally display sections based on voting status -->
        ${
          user.hasVoted
            ? `
        <div id="authority-peer-id-container">
            <h4>Authority Peer ID: <span id="authority-id">Loading...</span></h4>
            <input type="text" id="authority-peer-id" placeholder="Enter Authority Peer ID" required>
            <button id="connect-authority">Connect to Authority</button>
        </div>

        <div>
            <button id="show-blockchain">Show Blockchain Data</button>
            <div id="blockchain-section" style="display: none;">
                <h2>Blockchain Data</h2>
                <textarea id="blockchain-display" rows="10" cols="50" readonly></textarea>
            </div>
        </div>

        <!-- Verification section only shown if user has voted -->
        <input type="text" id="vote-hash-input" placeholder="Enter vote hash">
        <input type="number" id="block-number-input" placeholder="Enter block number">
        <button id="get-hashes-button-dash">Get Combined Hashes</button>

        <!-- Merkle proof display section -->
        <div id="merkle-proof-section">
            <h3>Merkle Proof</h3>
            <p><strong>Vote Hash:</strong> <span id="vote-hash-output"></span></p>
            <p><strong>Block Number:</strong> <span id="block-number-output"></span></p>
            <p><strong>Sibling Hash:</strong> <span id="sibling-hash-output"></span></p>
            <p id="uncle_hash"><strong>Uncle Hash:</strong> <span id="uncle-hash-output"></span></p>
            <p><strong>Merkle Root:</strong> <span id="merkle-root-output"></span></p>
        </div>
        `
            : ""
        }
        
        <script src="script.js"></script>
    </body>
    </html>
  `);
  });
});

//----------------------------------------------- voting submit route ---------------------------------------------------------------

// Voting Route
app.post("/submit_vote", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }

  const { candidate, voteConfirmation } = req.body;

  // Ensure the user confirms their vote by typing 'vote'
  if (voteConfirmation.toLowerCase() !== "vote") {
    return res.send(renderVotePage('Please type "vote" to confirm your vote.'));
  }

  const data = readDataFile();

  // Find the user by their voter ID stored in the session
  const userIndex = data.users.findIndex(
    (user) => user.voterid === req.session.userId
  );

  // Check if the user was not found or has already voted
  if (userIndex === -1 || data.users[userIndex].hasVoted) {
    return res.send("You have already voted!");
  }

  // Mark the user as having voted
  data.users[userIndex].hasVoted = true;

  // Write the updated data back to the file
  writeDataFile(data);

});

//-------------------------------------------------- MAIN LOGIC OF SUBMITION ----------------------------------------------------//

app.get("/after_vote", (req, res) => {
  const { voting_Hash, block_number } = req.query;
  console.log(voting_Hash);

  // Check if user is logged in
  if (!req.session.userId) {
    return res.redirect("/login");
  }

  // Read data from file
  const data = readDataFile();
  const userIndex = data.users.findIndex(
    (user) => user.voterid === req.session.userId
  );

  // // Check if the user was not found or has already voted
  // if (userIndex === -1 || data.users[userIndex].hasVoted) {
  //   return res.send('You have already voted!');
  // }

  // Mark the user as having voted
  data.users[userIndex].hasVoted = true;
  data.users[userIndex].vote_Hash = voting_Hash;
  data.users[userIndex].block_number = block_number;

  writeDataFile(data);

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vote Confirmation</title>
        <link rel="stylesheet" href="confirmation.css">
    </head>
    <body>
        <div class="confirmation-container">
            <h2>Your vote has been recorded and added to the blockchain.</h2>
            <p>You are being redirected to your dashboard...</p>
        </div>

        <script>
            // Redirect to dashboard after a delay
            setTimeout(() => {
                window.location.href = "/dashboard";
            }, 3000); // 3-second delay
        </script>
    </body>
    </html>
  `);
});

// Function to render the voting page with an optional error message
function renderVotePage(errorMessage = "") {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Voting Page</title>
        <link rel="stylesheet" href="voting.css"> 
    </head>
    <body>
        <h2>Voting Page</h2>

        <!-- Error Message Section -->
        ${
          errorMessage
            ? `<div class="error-message"><p>${errorMessage}</p></div>`
            : ""
        }

        <!-- Voting Form -->
        <form id="vote-form" action="/submit_vote" method="POST">
            <div id="votingOptions">
                <table>
                    <tr>
                        <th>Select Candidate</th>
                    </tr>
                    <tr>
                        <td><input type="radio" name="candidate" value="Candidate A" required>Candidate A</td>
                    </tr>
                    <tr>
                        <td><input type="radio" name="candidate" value="Candidate B">Candidate B</td>
                    </tr>
                    <tr>
                        <td><input type="radio" name="candidate" value="Candidate C">Candidate C</td>
                    </tr>
                </table>
                <p>Type "vote" to confirm your vote:</p>
                <input type="text" id="voteConfirmation" name="voteConfirmation" placeholder="Enter 'vote' to confirm" required>
                <button id="vote-submit" type="submit">Submit Vote</button>
            </div>
        </form>
    </body>
    </html>
  `;
}

//------------------------------------------------------ initialization  and  ending-------------------------------------------------------------------------

// Endpoint to end voting
app.post("/end-voting", (req, res) => {
  votingStatus = "ended";
  const votingData = req.body;

  // Write the voting data to a JSON file
  fs.writeFile(
    "votingData.json",
    JSON.stringify(votingData, null, 2),
    (err) => {
      if (err) {
        console.error("Error writing voting data to file:", err);
        return res.status(500).send({ message: "Error ending voting." });
      }

      res
        .status(200)
        .send({ message: "Voting ended and data saved successfully." });
    }
  );
});

// Start the server
const PORT = process.env.PORT || 3000; // Use 3000 if process.env.PORT is not defined
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// integrate peerjs server
const peerServer = ExpressPeerServer(server, {
  path: "/",
});

app.use("/peerjs", peerServer);

// Logout Route
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

//--------------------------------------------------------- 😜end of server code😜 -------------------------------------------------------------//
