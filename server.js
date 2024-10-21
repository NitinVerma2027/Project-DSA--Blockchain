const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const { spawn } = require('child_process'); // Import spawn from child_process


const app = express();
const dataFilePath = path.join(__dirname, 'data.json');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files from the public directory
app.use(session({
  secret: 'securevotingsecret',
  resave: false,
  saveUninitialized: true
}));

// Utility functions to read/write JSON file
const readDataFile = () => {
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify({ users: [] }, null, 2));
  }
  const data = fs.readFileSync(dataFilePath, 'utf8');
  return JSON.parse(data);
};

const writeDataFile = (data) => {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
};

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'registration.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/vote', (req, res) => {
  if (req.session.userId) {
    res.sendFile(path.join(__dirname, 'voting.html'));
  } else {
    res.redirect('/login');
  }
});

// Registration Route
app.post('/submit_registration', (req, res) => {
  const { name, email, voterid, password, confirmpassword } = req.body;
  if (password !== confirmpassword) {
    return res.send('Passwords do not match!');
  }

  const data = readDataFile();
  const existingUser = data.users.find(user => user.voterid === voterid);

  if (existingUser) {
    return res.send('Voter ID already exists. Please try a different one.');
  }

  const newUser = { name, email, voterid, password, hasVoted: false };
  data.users.push(newUser);
  writeDataFile(data);
  res.send('Registration successful! You can now <a href="/login">login</a>.');
});

// Login Route
app.post('/login', (req, res) => {
  const { voterid, password } = req.body;
  const data = readDataFile();
  const user = data.users.find(user => user.voterid === voterid && user.password === password);

  if (!user) {
    return res.send('Invalid Voter ID or Password.');
  }

  req.session.userId = user.voterid;
  req.session.hasVoted = user.hasVoted;
  res.redirect('/dashboard');
});

// Dashboard Route
app.get('/dashboard', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  const data = readDataFile();
  const user = data.users.find(user => user.voterid === req.session.userId);

  if (!user) {
    return res.redirect('/login');
  }

  // Serve the dashboard with voting status
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>User Dashboard</title>
        <link rel="stylesheet" href="dashboard.css">
    </head>
    <body>
        <div class="container">
            <h2>Welcome, ${user.name}!</h2>
            <div id="votedSection" style="${user.hasVoted ? 'display: block;' : 'display: none;'}">
                <p>You have already voted. Thank you for participating in the election.</p>
            </div>
            <div id="notVotedSection" style="${user.hasVoted ? 'display: none;' : 'display: block;'}">
                <p>You haven't voted yet. Please cast your vote by clicking the link below:</p>
                <a href="/vote"><button>Go to Voting Page</button></a>
            </div>
            <a href="/logout"><button>Logout</button></a>
        </div>
    </body>
    </html>
  `);
});
// Voting Route
app.post('/submit_vote', (req, res) => {
  if (!req.session.userId) {
      return res.redirect('/login');
  }

  const { candidate, voteConfirmation } = req.body;

  // Ensure the user confirms their vote by typing 'vote'
  if (voteConfirmation.toLowerCase() !== 'vote') {
      return res.send('Please type "vote" to confirm your vote.');
  }

  const data = readDataFile();

  // Find the user by their voter ID stored in the session
  const userIndex = data.users.findIndex(user => user.voterid === req.session.userId);

  // Check if the user was not found or has already voted
  if (userIndex === -1 || data.users[userIndex].hasVoted) {
      return res.send('You have already voted!');
  }

  // Mark the user as having voted
  data.users[userIndex].hasVoted = true;

  // Write the updated data back to the file
  writeDataFile(data);

  // Blockchain integration: Create a block using the C++ blockchain program
  const voteData = `UserID: ${req.session.userId}, Candidate: ${candidate}`;
  
  // Run the C++ blockchain executable with the vote data passed as an argument
  const blockchainProcess = spawn('./blockchain', [voteData]);

  // Handle the output from the C++ process
  blockchainProcess.stdout.on('data', (data) => {
      console.log(`Blockchain Output: ${data}`);
  });

  // Handle any errors from the C++ process
  blockchainProcess.stderr.on('data', (data) => {
      console.error(`Blockchain Error: ${data}`);
  });

  // Handle process exit
  blockchainProcess.on('close', (code) => {
      if (code === 0) {
          res.send('Your vote has been recorded and added to the blockchain.');
      } else {
          res.status(500).send('There was an error processing your vote.');
      }
  });
});


// Logout Route
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Start the server
const PORT = process.env.PORT || 3000;  // Use 3000 if process.env.PORT is not defined
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
