#!/usr/bin/env node
const fs = require('fs');
const { program } = require('commander');

function loadMovieLensData(directory) {
  return new Promise((resolve, reject) => {
    const ratingsByUser = {};
    const ratingsByMovie = {};
    const movies = {};
    const users = {};
    const genres = {};

    fs.readFile(`${directory}/u.data`, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      const rows = data.split('\n');
      rows.forEach(row => {
        const [userId, movieId, rating, timestamp] = row.split('\t');
        const parsedRating = {
          userId: parseInt(userId),
          movieId: parseInt(movieId),
          rating: parseInt(rating),
          timestamp: parseInt(timestamp)
        };

        if (!ratingsByUser[parsedRating.userId]) {
          ratingsByUser[parsedRating.userId] = [];
        }
        ratingsByUser[parsedRating.userId].push(parsedRating);

        if (!ratingsByMovie[parsedRating.movieId]) {
          ratingsByMovie[parsedRating.movieId] = [];
        }
        ratingsByMovie[parsedRating.movieId].push(parsedRating);
      });


      fs.readFile(`${directory}/u.user`, 'utf8', (err, userData) => {
        if (err) {
          reject(err);
          return;
        }

        const userRows = userData.split('\n');
        userRows.forEach(row => {
          const columns = row.split('|');
          const userId = parseInt(columns[0]);
          users[userId] = {
            userId: userId,
            age: parseInt(columns[1]),
            gender: columns[2],
            occupation: columns[3],
            // Include other relevant user information here based on your dataset's structure
          };
        });

        fs.readFile(`${directory}/u.genre`, 'utf8', (err, genreData) => {
          if (err) {
            reject(err);
            return;
          }

          const genreRows = genreData.split('\n');
          genreRows.forEach(row => {
            const [genreName, genreId] = row.split('|');
            genres[parseInt(genreId)] = {
              name: genreName,
              movies: [] // Initialize movies array for each genre
            };
          });

          fs.readFile(`${directory}/u.item`, 'utf8', (err, itemData) => {
            if (err) {
              reject(err);
              return;
            }

            const itemRows = itemData.split('\n');
            itemRows.forEach(row => {
              const columns = row.split('|');
              const movieId = parseInt(columns[0]);
              movies[movieId] = {
                movieId: movieId,
                title: columns[1],
                releaseDate: columns[2],
                genres: []
              };
              // Parse genres for the movie
              // Parse genres for the movie
              for (let i = 5; i < columns.length; i++) {
                if (columns[i] === '1') {
                  const genreId = i - 5;
                  if (genres[genreId]) {
                    genres[genreId].movies.push(movies[movieId].title);
                    movies[movieId].genres.push(genres[genreId].name);
                  }
                }
              }
            });

            // Convert the genres object to an array of genres with movie information
            const organizedGenres = Object.values(genres).map(genre => ({
              id: Object.keys(genres).find(key => genres[key] === genre),
              name: genre.name,
              movies: genre.movies.map(movieId => movies[movieId])
            }));

            // Finally, resolve with the collected data
            resolve({ ratingsByUser, ratingsByMovie, movies: Object.values(movies), users, genres });
          });
        });
      });
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

// Check if required options are provided
if (!directory || !numRecommendations || !similarity || !algorithm || !input) {
  console.error('Please provide all required options.');
  process.exit(1);
}

loadMovieLensData(directory)
  .then(({ ratingsByUser, ratingsByMovie, movies, users, genres }) => {
    // Display the parsed data in the terminal/console
    console.log('Ratings by User:', ratingsByUser);
    console.log('Ratings by Movie:', ratingsByMovie);
    console.log('Movies:', movies);
    console.log('Users:', users);
    console.log('Genres:', genres);
  })
  .catch(error => {
    console.error('Error:', error);
  });


