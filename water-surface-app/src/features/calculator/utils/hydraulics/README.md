# Hydraulics Module Documentation

This document provides an overview of the hydraulics module used for water surface profile calculations in the Water Surface App.

## Module Structure

The hydraulics module is organized into the following files:

- `index.ts`: Re-exports all functions from the specialized modules
- `channelGeometry.ts`: Functions for calculating geometric properties of channels
- `flowParameters.ts`: Functions for calculating flow parameters like velocity, Froude number, etc.
- `criticalFlow.ts`: Functions for critical flow calculations
- `normalFlow.ts`: Functions for normal flow calculations
- `hydraulicJump.ts`: Functions for hydraulic jump calculations
- `standardStep.ts`: Main implementation of the standard step method for water surface profiles

## Key Functions

### Channel Geometry

- `calculateArea(depth, params)`: Calculate cross-sectional area for a given water depth
- `calculateWetPerimeter(depth, params)`: Calculate wetted perimeter
- `calculateTopWidth(depth, params)`: Calculate top width of water surface
- `calculateHydraulicRadius(depth, params)`: Calculate hydraulic radius (A/P)
- `calculateHydraulicDepth(depth, params)`: Calculate hydraulic depth (A/T)

### Flow Parameters

- `calculateVelocity(discharge, area)`: Calculate flow velocity
- `calculateFroudeNumber(velocity, depth, params)`: Calculate Froude number
- `calculateSpecificEnergy(depth, velocity, params)`: Calculate specific energy
- `calculateFrictionSlope(velocity, hydraulicRadius, manningN, units)`: Calculate friction slope

### Critical Flow

- `calculateCriticalDepth(params)`: Calculate critical depth
- `calculateCriticalVelocity(params)`: Calculate velocity at critical depth
- `calculateCriticalEnergy(params)`: Calculate energy at critical depth
- `isFlowCritical(depth, discharge, params)`: Check if flow is critical

### Normal Flow

- `calculateNormalDepth(params)`: Calculate normal depth using Manning's equation
- `calculateNormalVelocity(params)`: Calculate velocity at normal depth
- `calculateNormalFroudeNumber(params)`: Calculate Froude number at normal depth
- `classifyChannelSlope(params)`: Classify channel slope as mild, critical, or steep
- `isFlowUniform(depth, params)`: Check if flow is uniform

### Hydraulic Jump

- `isHydraulicJumpPossible(upstreamDepth, params)`: Check if hydraulic jump is possible
- `calculateSequentDepth(depth1, params)`: Calculate sequent depth for a hydraulic jump
- `calculateEnergyLoss(depth1, depth2)`: Calculate energy loss in a hydraulic jump
- `calculateHydraulicJump(upstreamDepth, position, params)`: Calculate hydraulic jump details

### Water Surface Profile

- `calculateWaterSurfaceProfile(params)`: Calculate complete water surface profile

## Usage Example

```typescript
import { ChannelParams } from '../../stores/calculatorSlice';
import { 
  calculateWaterSurfaceProfile,
  calculateCriticalDepth,
  calculateNormalDepth
} from './index';

// Define channel parameters
const channelParams: ChannelParams = {
  channelType: 'trapezoidal',
  bottomWidth: 10,
  sideSlope: 2,
  manningN: 0.03,
  channelSlope: 0.001,
  discharge: 100,
  length: 1000,
  units: 'metric'
};

// Calculate critical and normal depths
const criticalDepth = calculateCriticalDepth(channelParams);
const normalDepth = calculateNormalDepth(channelParams);

console.log(`Critical Depth: ${criticalDepth} m`);
console.log(`Normal Depth: ${normalDepth} m`);

// Calculate water surface profile
const profile = calculateWaterSurfaceProfile(channelParams);

// Use the results
console.log(`Profile Type: ${profile.profileType}`);
console.log(`Number of Points: ${profile.flowProfile.length}`);

// Check for hydraulic jump
if (profile.hydraulicJump) {
  console.log(`Hydraulic Jump at Station: ${profile.hydraulicJump.position} m`);
  console.log(`Upstream Depth: ${profile.hydraulicJump.depth1} m`);
  console.log(`Downstream Depth: ${profile.hydraulicJump.depth2} m`);
}
```

## Handling Different Channel Types

The module supports the following channel types:
- Rectangular
- Trapezoidal
- Triangular
- Circular

Each channel type requires specific parameters:
- Rectangular: `bottomWidth`
- Trapezoidal: `bottomWidth` and `sideSlope`
- Triangular: `sideSlope`
- Circular: `diameter`

## Dependencies

The hydraulics module relies on the `ChannelParams` type from the calculator slice. This type defines the parameters needed for hydraulic calculations, including channel geometry, flow conditions, and boundary conditions.

## Potential Improvements

1. Add more channel types (e.g., parabolic, egg-shaped)
2. Implement more advanced methods for water surface profiles
3. Add support for spatially varied flow
4. Implement visualization utilities for water surface profiles
5. Add functions for sediment transport calculations
6. Implement a more robust hydraulic jump detection algorithm