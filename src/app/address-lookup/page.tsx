"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AddressLookupResult } from "@/lib/types";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

/**
 * FIX: Address lookup geocoding was not working because:
 * 1. The Census geocoder requires addresses in a specific format
 * 2. The API call was being proxied through the backend which may not be set up
 * 3. Street abbreviations and formatting need normalization
 *
 * This implementation calls the Census Bureau Geocoder API directly from the
 * client and also normalizes the address format before sending.
 */

function normalizeAddress(address: string): string {
  // The Census geocoder works better with standardized formats
  // Remove extra spaces and normalize common abbreviations
  let normalized = address.trim().replace(/\s+/g, " ");

  // If the address looks like "STREET, CITY, ZIP" (no state), add GA
  const parts = normalized.split(",").map((p) => p.trim());
  if (parts.length === 3) {
    const lastPart = parts[2];
    // If last part is just a zip code, insert state
    if (/^\d{5}(-\d{4})?$/.test(lastPart)) {
      normalized = `${parts[0]}, ${parts[1]}, GA ${lastPart}`;
    }
  } else if (parts.length === 2) {
    // "STREET, CITY" - add state
    normalized = `${parts[0]}, ${parts[1]}, GA`;
  }

  return normalized;
}

async function geocodeAddress(
  address: string
): Promise<AddressLookupResult[]> {
  const normalized = normalizeAddress(address);
  const encodedAddress = encodeURIComponent(normalized);

  const censusUrl = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encodedAddress}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;

  const res = await fetch(censusUrl);
  if (!res.ok) {
    throw new Error(`Geocoder API error: ${res.status}`);
  }

  const data = await res.json();
  const matches = data?.result?.addressMatches || [];

  if (matches.length === 0) {
    // Try alternate benchmark if no results
    const altUrl = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encodedAddress}&benchmark=Public_AR_Census2020&vintage=Census2020_Current&format=json`;
    const altRes = await fetch(altUrl);
    if (altRes.ok) {
      const altData = await altRes.json();
      const altMatches = altData?.result?.addressMatches || [];
      if (altMatches.length > 0) {
        return mapMatches(altMatches);
      }
    }
  }

  return mapMatches(matches);
}

function mapMatches(
  matches: Array<{
    matchedAddress: string;
    coordinates: { x: number; y: number };
    geographies?: Record<
      string,
      Array<{ NAME: string; GEOID: string; [key: string]: string }>
    >;
  }>
): AddressLookupResult[] {
  return matches.map((match) => ({
    matched_address: match.matchedAddress,
    latitude: match.coordinates.y,
    longitude: match.coordinates.x,
    geographies: match.geographies
      ? Object.fromEntries(
          Object.entries(match.geographies).map(([key, values]) => [
            key,
            values.map((v) => ({
              name: v.NAME,
              code: v.GEOID,
            })),
          ])
        )
      : undefined,
  }));
}

export default function AddressLookupPage() {
  const [address, setAddress] = useState("");
  const [results, setResults] = useState<AddressLookupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setSearched(true);

    try {
      const data = await geocodeAddress(address);
      setResults(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to look up address. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Address Lookup</h1>
      <p className="text-gray-600">
        Enter an address to geocode it and find associated geographic
        information.
      </p>

      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter address (e.g., 659 Arlington Pl, Macon, GA 31201)"
          className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Looking up..." : "Look Up"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {searched && !loading && results.length === 0 && !error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            No matching addresses found. Try adding the state abbreviation (e.g.,
            &quot;659 Arlington Pl, Macon, GA 31201&quot;).
          </p>
        </div>
      )}

      {results.map((result, index) => (
        <div key={index} className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {result.matched_address}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Coordinates: {result.latitude.toFixed(6)},{" "}
              {result.longitude.toFixed(6)}
            </p>

            <Map
              latitude={result.latitude}
              longitude={result.longitude}
              className="h-64 w-full rounded-lg mb-4"
            />

            {result.geographies && Object.keys(result.geographies).length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Geographic Information
                </h4>
                <div className="divide-y divide-gray-200">
                  {Object.entries(result.geographies).map(
                    ([geoType, values]) => (
                      <div key={geoType} className="py-3">
                        <dt className="text-sm font-medium text-gray-500 mb-1">
                          {geoType
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (s) => s.toUpperCase())
                            .trim()}
                        </dt>
                        <dd className="text-sm text-gray-900">
                          {values.map((v) => v.name).join(", ")}
                        </dd>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
