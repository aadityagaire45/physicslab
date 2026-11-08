import { CELSIUS_OFFSET, ELECTRON_VOLT } from './constants';

export const degToRad = (degrees: number): number => (degrees * Math.PI) / 180;

export const radToDeg = (radians: number): number => (radians * 180) / Math.PI;

export const celsiusToKelvin = (celsius: number): number => celsius + CELSIUS_OFFSET;

export const kelvinToCelsius = (kelvin: number): number => kelvin - CELSIUS_OFFSET;

export const joulesToElectronVolts = (joules: number): number => joules / ELECTRON_VOLT;

export const electronVoltsToJoules = (electronVolts: number): number =>
  electronVolts * ELECTRON_VOLT;

export const nanometresToMetres = (nm: number): number => nm * 1e-9;

export const metresToNanometres = (m: number): number => m * 1e9;
