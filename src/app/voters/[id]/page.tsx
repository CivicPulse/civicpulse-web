"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { getVoter, geocodeVoter } from "@/lib/api";
import { Voter } from "@/lib/types";
import DistrictAssignments from "@/components/DistrictAssignments";
import GeocodedLocations from "@/components/GeocodedLocations";

// Leaflet must be loaded client-side only
const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function VoterDetailPage() {
  const params = useParams();
  const voterId = params.id as string;
  const [voter, setVoter] = useState<Voter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (!voterId) return;

    async function loadVoter() {
      try {
        setLoading(true);
        const data = await getVoter(voterId);
        setVoter(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load voter data"
        );
      } finally {
        setLoading(false);
      }
    }

    loadVoter();
  }, [voterId]);

  async function handleGeocode() {
    if (!voterId) return;
    setGeocoding(true);
    try {
      await geocodeVoter(voterId);
      // Reload voter to get updated geocoding
      const data = await getVoter(voterId);
      setVoter(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to geocode voter"
      );
    } finally {
      setGeocoding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!voter) {
    return (
      <div className="text-center py-12 text-gray-500">Voter not found.</div>
    );
  }

  const primaryLocation =
    voter.geocoded_locations && voter.geocoded_locations.length > 0
      ? voter.geocoded_locations.reduce((best, loc) =>
          loc.confidence > best.confidence ? loc : best
        )
      : null;

  const fullAddress = [voter.address, voter.city, voter.state, voter.zip]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {voter.first_name} {voter.middle_name ? `${voter.middle_name} ` : ""}
          {voter.last_name}
          {voter.suffix ? ` ${voter.suffix}` : ""}
        </h1>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            voter.status === "ACTIVE"
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {voter.status}
        </span>
      </div>

      {/* Map */}
      {primaryLocation && (
        <Map
          latitude={primaryLocation.latitude}
          longitude={primaryLocation.longitude}
          className="h-72 w-full rounded-lg shadow"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voter Info */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Voter Information
          </h3>
          <dl className="divide-y divide-gray-200">
            <div className="flex justify-between py-3">
              <dt className="text-sm font-medium text-gray-500">Voter ID</dt>
              <dd className="text-sm text-gray-900">{voter.voter_id}</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-sm font-medium text-gray-500">County</dt>
              <dd className="text-sm text-gray-900">{voter.county}</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-sm font-medium text-gray-500">
                Registration Date
              </dt>
              <dd className="text-sm text-gray-900">
                {new Date(voter.registration_date).toLocaleDateString(
                  "en-US",
                  { year: "numeric", month: "long", day: "numeric" }
                )}
              </dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-sm font-medium text-gray-500">Address</dt>
              <dd className="text-sm text-gray-900">{fullAddress}</dd>
            </div>
            {voter.race && (
              <div className="flex justify-between py-3">
                <dt className="text-sm font-medium text-gray-500">Race</dt>
                <dd className="text-sm text-gray-900">{voter.race}</dd>
              </div>
            )}
            {voter.gender && (
              <div className="flex justify-between py-3">
                <dt className="text-sm font-medium text-gray-500">Gender</dt>
                <dd className="text-sm text-gray-900">{voter.gender}</dd>
              </div>
            )}
            {voter.birth_year && (
              <div className="flex justify-between py-3">
                <dt className="text-sm font-medium text-gray-500">
                  Birth Year
                </dt>
                <dd className="text-sm text-gray-900">{voter.birth_year}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* District Assignments - FIX: reads both flat fields and array */}
        <DistrictAssignments voter={voter} />
      </div>

      {/* Geocoded Locations */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Geocoded Locations
        </h2>
        <button
          onClick={handleGeocode}
          disabled={geocoding}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          {geocoding ? "Geocoding..." : "Re-geocode"}
        </button>
      </div>
      <GeocodedLocations locations={voter.geocoded_locations || []} />
    </div>
  );
}
