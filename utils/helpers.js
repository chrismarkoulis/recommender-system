const fs = require('fs');

function calculateSimilarity(metric, vector1, vector2) {
  if (metric === 'cosine') {
    const dotProduct = vector1.reduce((acc, val, i) => acc + val * vector2[i], 0);
    const magnitude1 = Math.sqrt(vector1.reduce((acc, val) => acc + val ** 2, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((acc, val) => acc + val ** 2, 0));

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  } else if (metric === 'jaccard') {
    const intersection = vector1.reduce((acc, val, i) => acc + (val && val === vector2[i]), 0);
    const union = vector1.reduce((acc, val, i) => acc + (val || vector2[i]), 0);

    return intersection / union;
  } else if (metric === 'dice') {
    const intersection = vector1.reduce((acc, val, i) => acc + (val && val === vector2[i]), 0);
    const magnitude1 = vector1.reduce((acc, val) => acc + val, 0);
    const magnitude2 = vector2.reduce((acc, val) => acc + val, 0);

    return (2 * intersection) / (magnitude1 + magnitude2);
  } else if (metric === 'pearson') {
    const sum1 = vector1.reduce((acc, val) => acc + val, 0);
    const sum2 = vector2.reduce((acc, val) => acc + val, 0);
    const sum1Sq = vector1.reduce((acc, val) => acc + val ** 2, 0);
    const sum2Sq = vector2.reduce((acc, val) => acc + val ** 2, 0);
    const pSum = vector1.reduce((acc, val, i) => acc + val * vector2[i], 0);
    const n = vector1.length;

    const numerator = pSum - (sum1 * sum2) / n;
    const denominator = Math.sqrt((sum1Sq - (sum1 ** 2) / n) * (sum2Sq - (sum2 ** 2) / n));

    if (denominator === 0) {
      return 0;
    }

    return numerator / denominator;
  } else {
    return 0;
  }
}

function getUserBasedRecommendations(userId, numRecommendations, similarityMetric, ratingsByUser) {
  const userRatings = ratingsByUser[userId];

  // Calculate similarity between the given user and all other users
  const userSimilarities = {};
  for (const otherUserId in ratingsByUser) {
    if (otherUserId !== userId) {
      const otherUserRatings = ratingsByUser[otherUserId];
      const similarity = calculateSimilarity(similarityMetric, userRatings, otherUserRatings);
      userSimilarities[otherUserId] = similarity;
    }
  }

  // Sort users by similarity in descending order
  const sortedSimilarities = Object.entries(userSimilarities)
    .sort(([, similarityA], [, similarityB]) => similarityB - similarityA);

  // Get top similar users
  const topSimilarUsers = sortedSimilarities.slice(0, numRecommendations);

  // Recommend items based on top similar users
  const recommendedItems = {}; // Object to store recommended items with scores

  for (const [similarUserId, similarity] of topSimilarUsers) {
    const similarUserRatings = ratingsByUser[similarUserId];

    // Consider items rated by similar users but not by the given user
    for (const { movieId, rating } of similarUserRatings) {
      if (!(movieId in userRatings)) {
        if (!(movieId in recommendedItems)) {
          recommendedItems[movieId] = 0;
        }
        // Use similarity to weight the recommendation score
        recommendedItems[movieId] += rating * similarity;
      }
    }
  }

  // Sort recommended items by score in descending order
  const sortedRecommendedItems = Object.entries(recommendedItems)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .slice(0, numRecommendations)
    .map(([movieId]) => movieId); // Get movie IDs from recommendations

  return sortedRecommendedItems;
}

function getItemBasedRecommendations(userId, numRecommendations, similarityMetric, ratingsByUser) {
  const userRatings = ratingsByUser[userId]; // Fetch ratings for the given user

  // Create a map to store aggregated item ratings
  const itemRatings = {};

  // Aggregate item ratings from all users except the given user
  for (const otherUserId in ratingsByUser) {
    if (otherUserId !== userId) {
      const otherUserRatings = ratingsByUser[otherUserId];

      for (const { movieId, rating } of otherUserRatings) {
        if (!(movieId in userRatings)) {
          if (!itemRatings[movieId]) {
            itemRatings[movieId] = [];
          }
          itemRatings[movieId].push(rating);
        }
      }
    }
  }

  // item-item similarities
  const itemSimilarities = {};
  for (const movieId in itemRatings) {
    const similarity = calculateSimilarity(similarityMetric, userRatings, itemRatings[movieId]);
    itemSimilarities[movieId] = similarity || 0;
  }

  // Sort by desc
  const sortedSimilarities = Object.entries(itemSimilarities)
    .sort(([, similarityA], [, similarityB]) => similarityB - similarityA);

  // Top similar items
  const topSimilarItems = sortedSimilarities.slice(0, numRecommendations).map(([movieId]) => movieId);

  return topSimilarItems;
}

function populateTagVectors(ratingsByUser) {
  const tagVectors = {}; // Map to store tag vectors for each item

  // Loop through user-item interactions to populate tag vectors
  for (const userId in ratingsByUser) {
    const userRatings = ratingsByUser[userId];

    for (const { movieId, rating } of userRatings) {
      if (!tagVectors[movieId]) {
        tagVectors[movieId] = Array(5).fill(0);
      }

      let tagIndex = 0; // Tag index based on the rating
      if (rating === 5) {
        tagIndex = 0;
      } else if (rating === 4) {
        tagIndex = 1;
      } else if (rating === 3) {
        tagIndex = 2;
      } else if (rating === 2) {
        tagIndex = 3;
      } else if (rating === 1) {
        tagIndex = 4;
      }

      // Increment the tag count in the tag vector
      tagVectors[movieId][tagIndex]++;
    }
  }

  return tagVectors;
}

function getTagBasedRecommendations(movieId, numRecommendations, similarityMetric, ratingsByUser) {
  // Create vectors to represent how many users have tagged each item with specific tags
  const tagVectors = populateTagVectors(ratingsByUser);

  // Calculate similarities between the given movie and all other movies
  const movieSimilarities = {};
  for (const otherMovieId in tagVectors) {
    if (otherMovieId !== movieId) {
      const similarity = calculateSimilarity(similarityMetric, tagVectors[movieId], tagVectors[otherMovieId]);
      movieSimilarities[otherMovieId] = similarity;
    }
  }

  const sortedSimilarities = Object.entries(movieSimilarities)
    .sort(([, similarityA], [, similarityB]) => similarityB - similarityA);

  // Get top similar movies
  const topSimilarMovies = sortedSimilarities.slice(0, numRecommendations).map(([otherMovieId]) => otherMovieId);

  return topSimilarMovies;
}

function calculateTFIDFVectors(inputId, numRecommendations, similarityMetric, ratingsByUser, movies) {
  const allKeywords = {}; // Map to store all unique keywords and their occurrence count
  const tfVectors = {}; // Map to store TF vectors for each movie
  const idfVector = {}; // Vector to store IDF values for keywords

  // Iterate through ratings to build TF vectors and collect unique keywords
  for (const userId in ratingsByUser) {
    ratingsByUser[userId].forEach(rating => {
      const movieId = rating.movieId.toString();
      const { title } = movies[movieId] || {};

      // Consider only the movie of interest (specified by inputId)
      if (inputId && movieId !== inputId.toString() || !title) return;

      const words = title.toLowerCase().split(' ');

      // Calculate TF vectors for each movie
      if (!tfVectors[movieId]) {
        tfVectors[movieId] = {};
      }
      words.forEach(word => {
        tfVectors[movieId][word] = (tfVectors[movieId][word] || 0) + 1;

        if (!allKeywords[word]) {
          allKeywords[word] = 1;
        } else {
          allKeywords[word]++;
        }
      });
    });
  }

  // Calculate IDF values for each keyword
  const numMovies = Object.keys(tfVectors).length;
  for (const word in allKeywords) {
    const count = allKeywords[word];
    idfVector[word] = Math.log(numMovies / count);
  }

  // Calculate TF-IDF vectors for the specified movie (inputId)
  const tfidfVector = {};
  if (inputId && tfVectors[inputId.toString()]) {
    const tfVector = tfVectors[inputId.toString()];
    for (const word in tfVector) {
      tfidfVector[word] = tfVector[word] * idfVector[word];
    }
    tfVectors[inputId.toString()] = tfidfVector;
  }

  // Return TF-IDF vectors for the specified movie or all movies
  return inputId ? tfVectors[inputId.toString()] : tfVectors;
}



function ParseMovieLensData(directory, numRecommendations, similarity, algorithm, inputId) {
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
            occupation: columns[3]
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
              movies: []
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


            /* ALGORITHM CASES */

            if (algorithm === 'user') {
              // User-user recommendation logic
              if (similarity === 'jaccard' || similarity === 'dice' || similarity === 'cosine' || similarity === 'pearson') {
                const recommendations = getUserBasedRecommendations(inputId, numRecommendations, similarity, ratingsByUser);
                resolve(recommendations.map(movieId => movies[movieId].title));
              } else {
                reject('Invalid similarity metric specified for user algorithm.');
              }
            } else if (algorithm === 'item') {
              // Item-item recommendation logic
              if (similarity === 'jaccard' || similarity === 'dice' || similarity === 'cosine' || similarity === 'pearson') {
                const itemBasedRecommendations = getItemBasedRecommendations(inputId, numRecommendations, similarity, ratingsByUser);
                resolve(itemBasedRecommendations.map(movieId => movies[movieId].title));
              } else {
                reject('Invalid similarity metric specified for item algorithm.');
              }
            } else if (algorithm === 'tag') {
              // Tag-based recommendation logic
              if (similarity === 'jaccard' || similarity === 'dice' || similarity === 'cosine' || similarity === 'pearson') {
                const tagBasedRecommendations = getTagBasedRecommendations(inputId, numRecommendations, similarity, ratingsByUser);
                resolve(tagBasedRecommendations);
              } else {
                reject('Invalid similarity metric specified for tag algorithm.');
              }
            } else if (algorithm === 'title') {
              // Content-based recommendation logic
              if (similarity === 'jaccard' || similarity === 'dice' || similarity === 'cosine' || similarity === 'pearson') {
                const tfidfVectors = calculateTFIDFVectors(inputId, numRecommendations, similarity, ratingsByUser, movies);
                resolve(tfidfVectors);
              } else {
                reject('Invalid similarity metric specified for title algorithm.');
              }
            } else if (algorithm === 'hybrid') {
              // custom weights based on preference or performance
              /*
              This approach involves assigning weights to each algorithm's output and then combining their scores for each movie. 
              The final step sorts these recommendations based on their combined scores and selects the top movies to recommend. 
              Adjusting the weights can help emphasize or de-emphasize the influence of each individual algorithm on 
              the final recommendations.
              */
              const weights = {
                user: 0.3,
                item: 0.2,
                tag: 0.3,
                title: 0.2
              };

              const recommendations = {};

              // Get recommendations from each individual algorithm
              const userRecommendations = getUserBasedRecommendations(inputId, numRecommendations, similarity, ratingsByUser);
              const itemRecommendations = getItemBasedRecommendations(inputId, numRecommendations, similarity, ratingsByUser);
              const tagRecommendations = getTagBasedRecommendations(inputId, numRecommendations, similarity, ratingsByUser);
              const titleRecommendations = calculateTFIDFVectors(inputId, numRecommendations, similarity, ratingsByUser, movies);

              // Merge recommendations using weighted scores
              for (const movieId in userRecommendations) {
                recommendations[movieId] =
                  (weights.user * (userRecommendations[movieId] || 0)) +
                  (weights.item * (itemRecommendations[movieId] || 0)) +
                  (weights.tag * (tagRecommendations[movieId] || 0)) +
                  (weights.title * (titleRecommendations[movieId] || 0));
              }

              // Sort recommendations by their combined scores
              const sortedRecommendations = Object.keys(recommendations).sort(
                (a, b) => recommendations[b] - recommendations[a]
              );

              // Get the top 'numRecommendations' movies
              const topRecommendations = sortedRecommendations.slice(0, numRecommendations);

              resolve(`Hybrid recommendations using a combination of algorithms: \n${topRecommendations}`);
            }


            else {
              reject('Invalid algorithm specified.');
            }

          });
        });
      });
    });
  });
}


module.exports = { ParseMovieLensData };