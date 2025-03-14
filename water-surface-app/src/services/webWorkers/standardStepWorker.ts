/* 
 * Web worker for performing standard step calculations
 * This allows intensive hydraulic calculations to run in a separate thread,
 * preventing the main UI from freezing during computation.
 */

import { 
  ChannelParams
} from '../../features/calculator/stores/calculatorSlice';
import { calculateWaterSurfaceProfile } from '../../features/calculator/utils/hydraulics';

interface WorkerInput {
  params: ChannelParams;
}

// Listen for messages from the main thread
self.addEventListener('message', (event: MessageEvent<WorkerInput>) => {
  const { params } = event.data;
  
  try {
    // Calculate water surface profile using the shared utility function
    const output = calculateWaterSurfaceProfile(params);
    
    // Send results back to the main thread
    self.postMessage({
      status: 'success',
      data: {
        results: output.flowProfile,
        hydraulicJump: output.hydraulicJump ? {
          occurs: true,
          station: output.hydraulicJump.position,
          upstreamDepth: output.hydraulicJump.depth1,
          downstreamDepth: output.hydraulicJump.depth2
        } : { occurs: false }
      }
    });
  } catch (error) {
    // Send error back to the main thread
    self.postMessage({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});