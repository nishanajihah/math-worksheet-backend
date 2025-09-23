// import express framework and (cors) cross-origin requests
const express = require("express");
const cors = require("cors");

// create express app and define port server
const app = express();
const port = 3000;

// simple array store scores temporarily
let highScores = [];

// store question and answers on the backend
const questionsAndAnswers = [
      { id: 'q1', question: '17', correctAnswer: '20', choices: ['10', '20', '17'] },
      { id: 'q2', question: '75', correctAnswer: '80', choices: ['70', '80', '75'] },
      { id: 'q3', question: '64', correctAnswer: '60', choices: ['64', '70', '60'] },
      { id: 'q4', question: '98', correctAnswer: '100', choices: ['80', '100', '98'] },
      { id: 'q5', question: '94', correctAnswer: '90', choices: ['100', '94', '90'] },
      { id: 'q6', question: '445', correctAnswer: '450', choices: ['450', '440', '500'] },
      { id: 'q7', question: '45', correctAnswer: '50', choices: ['50', '45', '40'] },
      { id: 'q8', question: '19', correctAnswer: '20', choices: ['20', '10', '19'] },
      { id: 'q9', question: '0', correctAnswer: '0', choices: ['10', '0'] },
      { id: 'q10', question: '199', correctAnswer: '200', choices: ['190', '100', '200'] },
      { id: 'q11', question: '165', correctAnswer: '170', choices: ['160', '170', '150'] },
      { id: 'q12', question: '999', correctAnswer: '1000', choices: ['990', '1000', '909'] }
];

// middleware for every incoming request
app.use(cors()); // request from our frontend
app.use(express.json()); // read json data sent from frontend

// API endpoint: GET /api/questions

// Endpoint send question to the frontend
app.get('/api/questions', (req, res) => {
      // This is the correct way to transform our data into the desired format.
      const questionsForFrontend = questionsAndAnswers.map(qa => ({
            id: qa.id,
            question: qa.question,
            choices: qa.choices
      }));
      // We send the array to the frontend.
      res.status(200).send(questionsForFrontend);
});

// API endpoint : POST /api/scores

// Endpoint handle saving new score'
app.post("/api/scores", (req, res) => {
      // Get name and score from request body
      const { name, userAnswers } = req.body;

      // basic validation - check if name and score exist
      if (!name || userAnswers === undefined) {
            return res.status(400).send({ message: 'Name and answers are required.' });
      }

      // Check the user answer against the correct answer stored on the backend
      let currentScore = 0;
      questionsAndAnswers.forEach(qa => {
            if (userAnswers[qa.id] === qa.correctAnswer) {
                  currentScore++;
            }
      });

      // Add new score to our list
      highScores.push({ name, score: currentScore, date: new Date() });

      // sort the scores from the highest to lowest
      highScores.sort((a, b) => b.score - a.score);

      // keep only the top 10 scores
      highScores = highScores.slice(0, 10);

      // Send a success message back to the frontend
      res.status(201).send({
            message: `You scored ${currentScore} out of 12!`,
            score: currentScore,
            highScores
      });
});

// API endpoint: GET /api/scores

// Endpoint handles retrieving the list of scores
app.get("/api/scores", (req, res) => {
      // send the current list of high scores back to the frontend
      res.status(200).send(highScores);
});

// start the server and listen for incoming request
app.listen(port, () => {
      console.log(`Backend server listening at http://localhost:${port}`);
});
