"use client";

import { Voter } from "@/lib/types";

interface DistrictAssignmentsProps {
  voter: Voter;
}

/**
 * Extracts district assignments from voter record fields.
 *
 * FIX: The original implementation only checked `voter.district_assignments` array
 * which may not be populated by the API. Georgia voter files store district info
 * as flat fields on the voter record (congressional_district, state_senate_district,
 * etc.). This component now reads from both the flat fields AND the array to ensure
 * district assignments are always displayed when available.
 */
function getDistrictAssignments(
  voter: Voter
): { label: string; value: string }[] {
  const assignments: { label: string; value: string }[] = [];

  // First, check flat fields on the voter record (Georgia voter file format)
  const districtFields: { key: keyof Voter; label: string }[] = [
    { key: "congressional_district", label: "Congressional District" },
    { key: "state_senate_district", label: "State Senate District" },
    { key: "state_house_district", label: "State House District" },
    { key: "county_commission_district", label: "County Commission District" },
    { key: "school_board_district", label: "School Board District" },
    { key: "city_council_district", label: "City Council District" },
    { key: "municipal_district", label: "Municipal District" },
    { key: "judicial_district", label: "Judicial District" },
    { key: "county_precinct", label: "County Precinct" },
    { key: "city_precinct", label: "City Precinct" },
    { key: "ward", label: "Ward" },
  ];

  for (const field of districtFields) {
    const value = voter[field.key];
    if (value && typeof value === "string" && value.trim() !== "") {
      assignments.push({ label: field.label, value: value.trim() });
    }
  }

  // Also check the district_assignments array if present
  if (voter.district_assignments && voter.district_assignments.length > 0) {
    for (const da of voter.district_assignments) {
      // Avoid duplicates by checking if we already have this type
      const existing = assignments.find(
        (a) =>
          a.label.toLowerCase().replace(/\s+/g, "_") ===
          da.district_type.toLowerCase().replace(/\s+/g, "_")
      );
      if (!existing) {
        assignments.push({
          label: da.district_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          value: da.district_name || da.district_id,
        });
      }
    }
  }

  return assignments;
}

export default function DistrictAssignments({
  voter,
}: DistrictAssignmentsProps) {
  const assignments = getDistrictAssignments(voter);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        District Assignments
      </h3>
      {assignments.length > 0 ? (
        <div className="divide-y divide-gray-200">
          {assignments.map((assignment, index) => (
            <div
              key={index}
              className="flex justify-between py-3 first:pt-0 last:pb-0"
            >
              <span className="text-sm font-medium text-gray-500">
                {assignment.label}
              </span>
              <span className="text-sm text-gray-900">{assignment.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          No district assignments found in voter file.
        </p>
      )}
    </div>
  );
}
