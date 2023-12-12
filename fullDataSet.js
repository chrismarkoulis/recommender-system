#!/usr/bin/env node
const fs = require('fs');
const csv = require('csv-parser');
const { program } = require('commander');

// Function to calculate cosine similarity between two vectors
function calculateCosineSimilarity(vector1, vector2) {
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i];
    magnitude1 += vector1[i] * vector1[i];
    magnitude2 += vector2[i] * vector2[i];
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  return dotProduct / (magnitude1 * magnitude2);
}

// Function to load and organize MovieLens ratings data
function loadMovieLensData(directory) {
  return new Promise((resolve, reject) => {
    const ratingsByUser = {};
    const ratingsByMovie = {};

    fs.createReadStream(`${directory}/ratings.csv`)
      .pipe(csv())
      .on('data', (row) => {
        const userId = parseInt(row.userId);
        const movieId = parseInt(row.movieId);
        const rating = parseFloat(row.rating);

        // Store ratings by user
        if (!ratingsByUser[userId]) {
          ratingsByUser[userId] = {};
        }
        ratingsByUser[userId][movieId] = rating;

        // Store ratings by movie
        if (!ratingsByMovie[movieId]) {
          ratingsByMovie[movieId] = {};
        }
        ratingsByMovie[movieId][userId] = rating;
      })
      .on('end', () => {
        resolve({ ratingsByUser, ratingsByMovie });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

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
console.log(process.argv);
// Check if required options are provided
if (!directory || !numRecommendations || !similarity || !algorithm || !input) {
  console.error('Please provide all required options.');
  process.exit(1);
}

// Load MovieLens data and perform basic recommendation (for demonstration)
loadMovieLensData(directory)
  .then(({ ratingsByUser, ratingsByMovie }) => {
    const inputUserId = parseInt(input);
    const userRatings = ratingsByUser[inputUserId];

    if (!userRatings) {
      console.error('User not found in the dataset.');
      process.exit(1);
    }

    // Example: Recommend movies based on similarity to the input user
    const recommendations = [];
    for (const movieId in ratingsByMovie) {
      if (!userRatings.hasOwnProperty(movieId)) {
        const similarity = calculateCosineSimilarity(Object.values(userRatings), Object.values(ratingsByMovie[movieId]));
        recommendations.push({ movieId, similarity });
      }
    }

    // Sort recommendations by similarity (descending)
    recommendations.sort((a, b) => b.similarity - a.similarity);

    // Get top 'numRecommendations' movies
    const topRecommendations = recommendations.slice(0, numRecommendations).map((item) => item.movieId);
    
    console.log('Top Recommendations:', topRecommendations);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
