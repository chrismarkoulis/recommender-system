# Recommender-system
Recommender system for movies implemented as a cli in Node.js
with the MovieLens 100k dataset

## Installation (Ensure you have node.js installed in your system)
- `npm install`
- `chmod +x index.js`
- `npm link`

## Execution
`recommender -d /path/to/directory -n <number_of_recommendations> -s <similarity_metric> -a <algorithm> -i <input>`
    


## Example
`recommender -d ./ml-100k -n 7 -s cosine -a user -i 1`

#### Output:
    PARAMETERS:
    {
    directory: './ml-100k',
    numRecommendations: '7',
    similarity: 'cosine',
    algorithm: 'user',
    input: '1'
    }
    ~~> RECOMMENDATIONS
    [
    'Good Will Hunting (1997)',
    'Heat (1995)',
    'Sabrina (1995)',
    'Sense and Sensibility (1995)',
    'Leaving Las Vegas (1995)',
    'Restoration (1995)',
    'Bed of Roses (1996)'
    ]


## Web UI
running the Web UI:

    npm run web