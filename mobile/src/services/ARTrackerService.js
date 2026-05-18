import api from './api';

/**
 * ARTrackerService
 * Handles the logic for sending AR physical coordinates to the Deep Learning backend.
 */
export const ARTrackerService = {
  
  /**
   * Sends the 15-frame history of coordinates to the Django PyTorch Model.
   * @param {Array} sequence - 2D Array of shape [15, 4] containing:
   *                           [distance_to_edge, velocity_x, velocity_y, speed_towards_edge]
   * @returns {Promise<number>} - Returns the calculated risk percentage (0.0 to 1.0)
   */
  sendTrackingDataToAI: async (sequence) => {
    try {
      const response = await api.post('predict_risk/', { sequence });
      return response.data; // { risk_score: 0.85, distance: 1.2 }
    } catch (error) {
      console.error('Failed to get AI Prediction:', error);
      return null;
    }
  },

  /**
   * DEVELOPER TOOL: Simulate walking towards a wall.
   * Use this to watch your HomeScreen Deep Learning Chart update live 
   * before you connect the actual camera sensors!
   */
  startSimulation: (updateSafetyContext) => {
    let currentDistance = 3.0; // Start 3 meters away from the wall
    
    return setInterval(async () => {
      // Simulate walking 0.2 meters closer to the wall every second
      currentDistance -= 0.2;
      if (currentDistance <= 0) currentDistance = 3.0; // Reset when we hit the wall
      
      const velocity_x = 0.5; // Walking speed
      const velocity_y = 0.0;
      const speed_towards_edge = 0.5; // Walking directly at the wall

      // Create a fake 15-frame history array of exactly the same data for simulation
      const mockSequence = Array(15).fill([
        currentDistance, 
        velocity_x, 
        velocity_y, 
        speed_towards_edge
      ]);

      // Call the PyTorch Deep Learning API
      const aiResult = await ARTrackerService.sendTrackingDataToAI(mockSequence);
      
      if (aiResult) {
        console.log(`Deep Learning Risk: ${(aiResult.risk_score * 100).toFixed(1)}% | Distance: ${currentDistance.toFixed(1)}m`);
        
        // This instantly updates the Chart on the HomeScreen!
        updateSafetyContext(aiResult.risk_score, aiResult.distance);
      }
    }, 2000); // Send an API request every 2 seconds
  }
};
