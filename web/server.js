const express = require('express');
const fs = require('fs');
const path = require('path');
const { ParseMovieLensData } = require('../utils/helpers');

const app = express();
const port = 3000;
const directory = path.join(__dirname, '..', 'ml-100k');



app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.use((req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self';"
    );
    next();
  });
  

app.post('/recommendations', async (req, res) => {
  const { inputId, similarity, algorithm } = req.body;

  try {
    const recommendations = await ParseMovieLensData(directory, 100, similarity, algorithm, inputId);
    
    res.json(recommendations);
  } catch (error) {
    res.status(500).send(`Error: ${error}`);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
