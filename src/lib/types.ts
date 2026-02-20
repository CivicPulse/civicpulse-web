export interface Voter {
  voter_id: string;
  county: string;
  registration_date: string;
  status: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  suffix?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  race?: string;
  gender?: string;
  birth_year?: string;
  congressional_district?: string;
  state_senate_district?: string;
  state_house_district?: string;
  county_commission_district?: string;
  school_board_district?: string;
  city_council_district?: string;
  municipal_district?: string;
  judicial_district?: string;
  county_precinct?: string;
  city_precinct?: string;
  ward?: string;
  district_assignments?: DistrictAssignment[];
  geocoded_locations?: GeocodedLocation[];
}

export interface DistrictAssignment {
  district_type: string;
  district_name: string;
  district_id: string;
}

export interface GeocodedLocation {
  provider: string;
  latitude: number;
  longitude: number;
  confidence: number;
  geocoded_at?: string;
}

export interface AddressLookupResult {
  matched_address: string;
  latitude: number;
  longitude: number;
  geographies?: {
    [key: string]: Array<{
      name: string;
      code: string;
      district_type?: string;
    }>;
  };
}

export interface VoterSearchParams {
  page?: number;
  per_page?: number;
  county?: string;
  status?: string;
  query?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface BulkGeocodeResponse {
  total: number;
  geocoded: number;
  failed: number;
  job_id?: string;
  status: string;
}
