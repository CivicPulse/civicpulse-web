import {
  Voter,
  AddressLookupResult,
  VoterSearchParams,
  PaginatedResponse,
  BulkGeocodeResponse,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${error}`);
  }

  return res.json();
}

export async function getVoters(
  params?: VoterSearchParams
): Promise<PaginatedResponse<Voter>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.per_page) searchParams.set("per_page", String(params.per_page));
  if (params?.county) searchParams.set("county", params.county);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.query) searchParams.set("query", params.query);

  const qs = searchParams.toString();
  return fetchApi<PaginatedResponse<Voter>>(`/voters${qs ? `?${qs}` : ""}`);
}

export async function getVoter(voterId: string): Promise<Voter> {
  return fetchApi<Voter>(`/voters/${voterId}`);
}

export async function geocodeVoter(
  voterId: string
): Promise<{ success: boolean; location?: { latitude: number; longitude: number } }> {
  return fetchApi(`/voters/${voterId}/geocode`, { method: "POST" });
}

export async function bulkGeocodeVoters(
  county?: string
): Promise<BulkGeocodeResponse> {
  const body = county ? JSON.stringify({ county }) : undefined;
  return fetchApi<BulkGeocodeResponse>("/voters/bulk-geocode", {
    method: "POST",
    body,
  });
}

export async function lookupAddress(
  address: string
): Promise<AddressLookupResult[]> {
  // Use the Census Bureau Geocoder API for address lookup
  // The Census geocoder expects a specific format
  const encodedAddress = encodeURIComponent(address);
  const censusUrl = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encodedAddress}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;

  const res = await fetch(censusUrl);
  if (!res.ok) {
    throw new Error(`Census API error: ${res.status}`);
  }

  const data = await res.json();
  const matches = data?.result?.addressMatches || [];

  return matches.map(
    (match: {
      matchedAddress: string;
      coordinates: { x: number; y: number };
      geographies?: Record<
        string,
        Array<{ NAME: string; GEOID: string; [key: string]: string }>
      >;
    }) => ({
      matched_address: match.matchedAddress,
      latitude: match.coordinates.y,
      longitude: match.coordinates.x,
      geographies: match.geographies
        ? Object.fromEntries(
            Object.entries(match.geographies).map(([key, values]) => [
              key,
              values.map(
                (v: { NAME: string; GEOID: string; [key: string]: string }) => ({
                  name: v.NAME,
                  code: v.GEOID,
                })
              ),
            ])
          )
        : undefined,
    })
  );
}
