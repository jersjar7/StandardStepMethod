import { createAction } from '@reduxjs/toolkit';
import { CalculationResult, HydraulicJump } from '../types';

/**
 * Redux actions for calculator operations
 * 
 * These action creators are used to dispatch actions related to the water surface profile calculator.
 * They're consumed primarily by the calculatorSlice reducer and the calculation hooks.
 */

// Action to start a calculation
export const startCalculation = createAction('calculator/startCalculation');

// Action to handle successful calculation
export const calculationSuccess = createAction<{
  results: CalculationResult[];
  hydraulicJump?: HydraulicJump;
}>('calculator/calculationSuccess');

// Action to handle calculation failure
export const calculationFailure = createAction<string>('calculator/calculationFailure');

// Action to reset the calculator state
export const resetCalculator = createAction('calculator/resetCalculator');

// Action to update channel parameters
export const updateChannelParams = createAction<Record<string, any>>('calculator/updateChannelParams');

// Action to set the channel type
export const setChannelType = createAction<'rectangular' | 'trapezoidal' | 'triangular' | 'circular'>('calculator/setChannelType');

// Action to set the selected result index
export const setSelectedResultIndex = createAction<number>('calculator/setSelectedResultIndex');

/**
 * Helper function to map the action creators to their Redux type string identifiers
 * This is useful when connecting the actions to the slice reducers
 */
export const calculatorActionTypes = {
  startCalculation: startCalculation.type,
  calculationSuccess: calculationSuccess.type,
  calculationFailure: calculationFailure.type,
  resetCalculator: resetCalculator.type,
  updateChannelParams: updateChannelParams.type,
  setChannelType: setChannelType.type,
  setSelectedResultIndex: setSelectedResultIndex.type
};

/**
 * Type definition for calculator action payloads
 * This helps when you need to access action payload types elsewhere
 */
export type CalculatorActionPayloads = {
  [calculationSuccess.type]: { 
    results: CalculationResult[]; 
    hydraulicJump?: HydraulicJump;
  };
  [calculationFailure.type]: string;
  [updateChannelParams.type]: Record<string, any>;
  [setChannelType.type]: 'rectangular' | 'trapezoidal' | 'triangular' | 'circular';
  [setSelectedResultIndex.type]: number;
  [startCalculation.type]: undefined;
  [resetCalculator.type]: undefined;
};