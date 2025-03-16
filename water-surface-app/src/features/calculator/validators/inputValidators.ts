import { ChannelParams } from '../stores/calculatorSlice';

/**
 * Validates the general input parameters that apply to all channel types
 * @param params Channel parameters
 * @returns Object with validation results
 */
export const validateGeneralInputs = (params: Partial<ChannelParams>): { isValid: boolean, errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Manning's roughness validation
  if (params.manningN !== undefined) {
    if (params.manningN <= 0) {
      errors.manningN = "Manning's roughness must be greater than 0";
    } else if (params.manningN > 0.2) {
      errors.manningN = "Manning's roughness value seems unusually high";
    }
  }
  
  // Channel slope validation
  if (params.channelSlope !== undefined) {
    if (params.channelSlope <= 0) {
      errors.channelSlope = "Channel slope must be greater than 0";
    } else if (params.channelSlope > 0.1) {
      errors.channelSlope = "Channel slope value seems unusually high";
    }
  }
  
  // Discharge validation
  if (params.discharge !== undefined) {
    if (params.discharge <= 0) {
      errors.discharge = "Discharge must be greater than 0";
    }
  }
  
  // Channel length validation
  if (params.length !== undefined) {
    if (params.length <= 0) {
      errors.length = "Channel length must be greater than 0";
    }
  }
  
  // Determine if the inputs are valid
  const isValid = Object.keys(errors).length === 0;
  
  return { isValid, errors };
};

/**
 * Validates the geometry parameters based on channel type
 * @param params Channel parameters
 * @returns Object with validation results
 */
export const validateGeometryInputs = (params: Partial<ChannelParams>): { isValid: boolean, errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  if (params.channelType === 'rectangular' || params.channelType === 'trapezoidal') {
    // Bottom width validation for rectangular and trapezoidal channels
    if (params.bottomWidth !== undefined) {
      if (params.bottomWidth <= 0) {
        errors.bottomWidth = "Bottom width must be greater than 0";
      }
    } else {
      errors.bottomWidth = "Bottom width is required";
    }
  }
  
  if (params.channelType === 'trapezoidal' || params.channelType === 'triangular') {
    // Side slope validation for trapezoidal and triangular channels
    if (params.sideSlope !== undefined) {
      if (params.sideSlope <= 0) {
        errors.sideSlope = "Side slope must be greater than 0";
      }
    } else {
      errors.sideSlope = "Side slope is required";
    }
  }
  
  if (params.channelType === 'circular') {
    // Diameter validation for circular channels
    if (params.diameter !== undefined) {
      if (params.diameter <= 0) {
        errors.diameter = "Diameter must be greater than 0";
      }
    } else {
      errors.diameter = "Diameter is required";
    }
  }
  
  // Determine if the inputs are valid
  const isValid = Object.keys(errors).length === 0;
  
  return { isValid, errors };
};

/**
 * Validates boundary conditions
 * @param params Channel parameters
 * @returns Object with validation results
 */
export const validateBoundaryConditions = (params: Partial<ChannelParams>): { isValid: boolean, errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // If both upstream and downstream depths are defined
  if (params.upstreamDepth !== undefined && params.downstreamDepth !== undefined) {
    // Check if both depths are valid
    if (params.upstreamDepth <= 0) {
      errors.upstreamDepth = "Upstream depth must be greater than 0";
    }
    
    if (params.downstreamDepth <= 0) {
      errors.downstreamDepth = "Downstream depth must be greater than 0";
    }
    
    // Check if flow type is consistent with boundary conditions
    if (params.upstreamDepth < params.downstreamDepth) {
      // This is a case of adverse slope or backwater curve
      // May need additional checks depending on your hydraulic model
    }
  } else if (params.upstreamDepth !== undefined) {
    // Only upstream depth is defined
    if (params.upstreamDepth <= 0) {
      errors.upstreamDepth = "Upstream depth must be greater than 0";
    }
  } else if (params.downstreamDepth !== undefined) {
    // Only downstream depth is defined
    if (params.downstreamDepth <= 0) {
      errors.downstreamDepth = "Downstream depth must be greater than 0";
    }
  }
  
  // Determine if the inputs are valid
  const isValid = Object.keys(errors).length === 0;
  
  return { isValid, errors };
};

/**
 * Validates all channel parameters
 * @param params Channel parameters
 * @returns Object with validation results
 */
export const validateAllInputs = (params: ChannelParams): { isValid: boolean, errors: Record<string, string> } => {
  // Validate general inputs
  const generalValidation = validateGeneralInputs(params);
  
  // Validate geometry inputs
  const geometryValidation = validateGeometryInputs(params);
  
  // Validate boundary conditions
  const boundaryValidation = validateBoundaryConditions(params);
  
  // Combine all errors
  const errors = {
    ...generalValidation.errors,
    ...geometryValidation.errors,
    ...boundaryValidation.errors
  };
  
  // Check if there are any errors
  const isValid = Object.keys(errors).length === 0;
  
  return { isValid, errors };
};

/**
 * Checks if calculation can proceed with the current inputs
 * @param params Channel parameters
 * @returns True if calculation can proceed, false otherwise
 */
export const canCalculate = (params: ChannelParams): boolean => {
  const { isValid } = validateAllInputs(params);
  return isValid;
};

/**
 * Get validation message for a specific field
 * @param params Channel parameters
 * @param fieldName Field name to validate
 * @returns Validation message or empty string if valid
 */
export const getValidationMessage = (params: ChannelParams, fieldName: string): string => {
  const { errors } = validateAllInputs(params);
  return errors[fieldName] || '';
};