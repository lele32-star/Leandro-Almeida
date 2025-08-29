import { describe, it, expect } from 'vitest';
import { haversine } from '../src/geo/haversine.js';

describe('haversine', () => {
  it('calculates distance between São Paulo and Rio de Janeiro correctly', () => {
    const saoPaulo = { lat: -23.5505, lng: -46.6333 };
    const rioDeJaneiro = { lat: -22.9068, lng: -43.1729 };
    const distance = haversine(saoPaulo, rioDeJaneiro);
    
    // Expected distance is approximately 361 km (actual great-circle distance)
    const expected = 361;
    const tolerance = expected * 0.005; // 0.5% tolerance
    
    expect(distance).toBeCloseTo(expected, 0);
    expect(Math.abs(distance - expected)).toBeLessThan(tolerance);
  });

  it('calculates distance between New York and Los Angeles correctly', () => {
    const newYork = { lat: 40.7128, lng: -74.0060 };
    const losAngeles = { lat: 34.0522, lng: -118.2437 };
    const distance = haversine(newYork, losAngeles);
    
    // Expected distance is approximately 3936 km (actual great-circle distance)
    const expected = 3936;
    const tolerance = expected * 0.005; // 0.5% tolerance
    
    expect(distance).toBeCloseTo(expected, 0);
    expect(Math.abs(distance - expected)).toBeLessThan(tolerance);
  });

  it('calculates distance between London and Paris correctly', () => {
    const london = { lat: 51.5074, lng: -0.1278 };
    const paris = { lat: 48.8566, lng: 2.3522 };
    const distance = haversine(london, paris);
    
    // Expected distance is approximately 344 km
    const expected = 344;
    const tolerance = expected * 0.005; // 0.5% tolerance
    
    expect(distance).toBeCloseTo(expected, 0);
    expect(Math.abs(distance - expected)).toBeLessThan(tolerance);
  });

  it('returns zero distance for identical points', () => {
    const point = { lat: 0, lng: 0 };
    const distance = haversine(point, point);
    expect(distance).toBe(0);
  });

  it('handles antipodal points correctly', () => {
    const point1 = { lat: 0, lng: 0 };
    const point2 = { lat: 0, lng: 180 };
    const distance = haversine(point1, point2);
    
    // Half Earth circumference ≈ 20,015 km
    const expected = 20015;
    const tolerance = expected * 0.005; // 0.5% tolerance
    
    expect(Math.abs(distance - expected)).toBeLessThan(tolerance);
  });

  it('handles negative coordinates correctly', () => {
    const point1 = { lat: -23.5505, lng: -46.6333 }; // São Paulo
    const point2 = { lat: 37.7749, lng: -122.4194 }; // San Francisco
    const distance = haversine(point1, point2);
    
    // Should return a positive distance
    expect(distance).toBeGreaterThan(0);
    
    // Expected distance is approximately 10,434 km (actual great-circle distance)
    const expected = 10434;
    const tolerance = expected * 0.005; // 0.5% tolerance
    
    expect(Math.abs(distance - expected)).toBeLessThan(tolerance);
  });
});