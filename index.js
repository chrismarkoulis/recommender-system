#!/usr/bin/env node
const fs = require('fs');
const { program } = require('commander');
const { ParseMovieLensData } = require('./utils/helpers');

// Define command-line options using Commander
program
  .option('-d, --directory <directory>', 'Directory where data is located')
  .option('-n, --num-recommendations <num>', 'Number of recommendations to return')
  .option('-s, --similarity <similarityMetric>', 'Similarity metric: cosine')
  .option('-a, --algorithm <algorithm>', 'Algorithm to use')
  .option('-i, --input <input>', 'Input for which recommendations are requested')
  .parse(process.argv);

// Extract values from command-line arguments
const { directory, numRecommendations, similarity, algorithm, input } = program.opts();
console.log({ directory, numRecommendations, similarity, algorithm, input });

// Check if required options are provided
if (!directory || !numRecommendations || !similarity || !algorithm || !input) {
  console.error('Please provide all required options.');
  process.exit(1);
}

ParseMovieLensData(directory, numRecommendations, similarity, algorithm, input)
  .then((data) => {
    // Display the parsed data in the terminal/console
    // console.log('Ratings by User:', ratingsByUser);
    // console.log('Ratings by Movie:', ratingsByMovie);
    // console.log('Movies:', movies);
    // console.log('Users:', users);
    // console.log('Genres:', genres);
    console.log('Recommendations or Data:', data);
  })
  .catch(error => {
    console.error('Error:', error);
  });


