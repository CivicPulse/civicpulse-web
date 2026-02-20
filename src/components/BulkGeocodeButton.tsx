"use client";

import { useState } from "react";
import { bulkGeocodeVoters } from "@/lib/api";

interface BulkGeocodeButtonProps {
  county?: string;
  onComplete?: () => void;
}

export default function BulkGeocodeButton({
  county,
  onComplete,
}: BulkGeocodeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    total: number;
    geocoded: number;
    failed: number;
    status: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBulkGeocode() {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await bulkGeocodeVoters(county);
      setResult(response);
      onComplete?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start bulk geocoding"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleBulkGeocode}
        disabled={isLoading}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Geocoding...
          </>
        ) : (
          <>
            <svg
              className="-ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
              />
            </svg>
            Bulk Geocode Voters
          </>
        )}
      </button>

      {result && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">
            <span className="font-medium">Bulk geocoding {result.status}.</span>{" "}
            {result.geocoded} of {result.total} voters geocoded
            {result.failed > 0 && ` (${result.failed} failed)`}.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}
