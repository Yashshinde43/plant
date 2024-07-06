import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request) {
  try {
    const body = await request.json();
    const { latitude, longitude } = body;

    // Validate input
    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
    }

    // Fetch plant data
    const plantData = await getPlantDetails(latitude, longitude);

    return NextResponse.json(plantData, { status: 200 });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: error.message || 'An error occurred while processing your request' }, { status: 500 });
  }
}

async function getPlantDetails(latitude, longitude) {
  const plantIdApiKey = process.env.PLANT_ID_API_KEY;

  if (!plantIdApiKey) {
    throw new Error('Plant.id API key is not set in environment variables');
  }

  const northernHemisphere = latitude > 0;

  try {
    // For testing purposes, let's use a valid image URL
    const placeholderImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Flowering_Malus_domestica_%28apple_tree%29.jpg/640px-Flowering_Malus_domestica_%28apple_tree%29.jpg';

    console.log('Sending request to Plant.id API with:', { latitude, longitude, placeholderImageUrl });

    const response = await axios.post('https://plant.id/api/v3/identification', {
      images: [placeholderImageUrl],
      latitude: latitude,
      longitude: longitude,
      similar_images: true,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': plantIdApiKey,
      }
    });

    console.log('Received response from Plant.id API:', response.data);

    // Process the response to extract plant data
    const plants = response.data.result.classification.suggestions.slice(0, 5).map(plant => ({
      name: plant.name,
      scientificName: plant.details.scientific_name,
      family: plant.details.taxonomy.family,
      genus: plant.details.taxonomy.genus,
      image: plant.details.image ? plant.details.image.value : null,
    }));

    return {
      commonPlants: plants,
      soilType: northernHemisphere ? "Varies, often loamy" : "Varies, often sandy or clay-rich",
      averageRainfall: northernHemisphere ? "Varies by region" : "Often higher in tropical regions",
      growingSeason: northernHemisphere ? "Typically April to October" : "Often year-round in tropical areas"
    };
  } catch (error) {
    console.error('Error fetching from Plant.id API:', error.response?.data || error.message);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      throw new Error(`Plant.id API error: ${error.response.status} - ${error.response.data.message || error.response.statusText}`);
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('No response received from Plant.id API');
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error('Error setting up request to Plant.id API: ' + error.message);
    }
  }
}