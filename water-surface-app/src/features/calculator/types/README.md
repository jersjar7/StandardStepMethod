# Water Surface Profile Results Type

## Overview

The `WaterSurfaceProfileResults` is a standardized interface used throughout the Water Surface Profile Calculator to represent the results of hydraulic calculations. This type ensures consistent data representation across utilities, components, and the application store.

## Type Definition

```typescript
interface WaterSurfaceProfileResults {
  // Detailed flow profile points along the channel
  flowProfile: FlowDepthPoint[];
  
  // Classification of the water surface profile
  profileType: ProfileType;
  
  // Channel slope classification
  channelType: string;
  
  // Critical depth for the given channel and discharge
  criticalDepth: number;
  
  // Normal depth for the given channel and discharge
  normalDepth: number;
  
  // Indicates if flow choking occurred during calculation
  isChoking: boolean;
  
  // Details of hydraulic jump, if any
  hydraulicJump?: HydraulicJump;
}
```

## FlowDepthPoint Interface

Each point in the `flowProfile` represents hydraulic properties at a specific channel station:

```typescript
interface FlowDepthPoint {
  x: number;                 // Station (distance along channel)
  y: number;                 // Water depth
  velocity: number;          // Flow velocity
  froudeNumber: number;      // Froude number
  specificEnergy: number;    // Specific energy
  criticalDepth: number;     // Critical depth
  normalDepth: number;       // Normal depth
  topWidth: number;          // Top width of water surface
}
```

## Usage Examples

### Accessing Profile Data

```typescript
// Typical access pattern
const waterSurfaceProfile: WaterSurfaceProfileResults = calculateWaterSurfaceProfile(channelParams);

// Iterate through flow points
waterSurfaceProfile.flowProfile.forEach(point => {
  console.log(`Station: ${point.x}, Depth: ${point.y}, Velocity: ${point.velocity}`);
});

// Check for hydraulic jump
if (waterSurfaceProfile.hydraulicJump?.occurs) {
  console.log('Hydraulic jump detected');
}
```

## Key Features

- **Standardization**: Consistent interface across calculation utilities
- **Comprehensive**: Includes detailed flow profile and key hydraulic characteristics
- **Flexible**: Optional `hydraulicJump` property
- **Type-Safe**: Fully typed for TypeScript support

## Recommended Practices

1. Always use this type when working with water surface profile calculations
2. Prefer destructuring and type-safe access
3. Use provided utility functions for additional analysis

## Related Types

- `ProfileType`: Enum for profile classification
- `HydraulicJump`: Interface for hydraulic jump details
- `FlowDepthPoint`: Detailed point representation

## Performance Considerations

- The `flowProfile` can contain a large number of points
- For visualization or analysis, consider using `createUniformProfile()` or `simplifyProfile()` utilities to reduce point count