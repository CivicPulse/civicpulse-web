"use client";

import { GeocodedLocation } from "@/lib/types";

interface GeocodedLocationsProps {
  locations: GeocodedLocation[];
}

export default function GeocodedLocations({
  locations,
}: GeocodedLocationsProps) {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Geocoded Locations
      </h3>
      {locations.length > 0 ? (
        <div className="space-y-4">
          {locations.map((location, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {location.provider}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    location.confidence >= 0.9
                      ? "bg-green-100 text-green-800"
                      : location.confidence >= 0.7
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {Math.round(location.confidence * 100)}% confidence
                </span>
              </div>
              <div className="text-sm text-gray-500">
                <span>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </span>
                {location.geocoded_at && (
                  <span className="ml-4">
                    Geocoded: {new Date(location.geocoded_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No geocoded locations found.</p>
      )}
    </div>
  );
}
